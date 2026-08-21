import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  getFunctions,
  httpsCallable,
  FunctionsError,
} from 'firebase/functions';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { EvaluationAuditLog, PerformanceStatus, TeamMember, PdiGoal } from '../types';
import {
  FirestoreDataValidationError,
  parseEvaluationPayload,
  parseTeamMember,
  validateTeamMember,
} from './firestoreSchemas';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const EXPECTED_PROJECT_ID = 'gen-lang-client-0169317507';
export const FIREBASE_FUNCTIONS_REGION = 'us-central1';

const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY?.trim();

if (resolvedFirebaseConfig.projectId !== EXPECTED_PROJECT_ID) {
  throw new Error(
    `Projeto Firebase incorreto: esperado ${EXPECTED_PROJECT_ID}, recebido ${resolvedFirebaseConfig.projectId}`
  );
}

if (!resolvedFirebaseConfig.firestoreDatabaseId) {
  throw new Error('VITE_FIREBASE_DATABASE_ID não configurado.');
}

const { firestoreDatabaseId, ...firebaseOptions } = resolvedFirebaseConfig;
const app = initializeApp(firebaseOptions);

if (appCheckSiteKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.warn('App Check indisponível; confirme a chave reCAPTCHA configurada.', error);
  }
}

export const auth = getAuth(app);
export const db = (() => {
  try {
    return initializeFirestore(app, { localCache: persistentLocalCache() }, firestoreDatabaseId);
  } catch (error) {
    console.warn('Persistência offline do Firestore indisponível; usando cache em memória.', error);
    return getFirestore(app, firestoreDatabaseId);
  }
})();
const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Persistência local do Firebase Auth indisponível; usando sessão em memória.', error);
});

export async function loginWithEmailAndPassword(email: string, password: string) {
  await authPersistenceReady;
  const credential = await signInWithEmailAndPassword(auth, email, password);

  if (!credential.user.emailVerified) {
    await firebaseSignOut(auth);
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  if (!await getCurrentUserRole(credential.user)) {
    await firebaseSignOut(auth);
    throw new Error('ROLE_NOT_AUTHORIZED');
  }

  return credential;
}

export type AppRole = 'leader' | 'admin';

export async function getCurrentUserRole(user: User): Promise<AppRole | null> {
  if (!user.emailVerified) return null;
  const tokenResult = await user.getIdTokenResult(true);
  const role = tokenResult.claims.role;
  return role === 'leader' || role === 'admin' ? role : null;
}

export async function logoutLeader() {
  return firebaseSignOut(auth);
}

export function subscribeToAuth(onUserChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, onUserChange);
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: string;
  path: string | null;
  code: string | null;
  authInfo: {
    userId?: string | null;
  };
}

export class EvaluationConflictError extends Error {
  constructor(
    public readonly evaluationId: string,
    public readonly expectedRevision: number,
    public readonly actualRevision: number,
  ) {
    super('Esta avaliação foi alterada por outra pessoa desde o carregamento.');
    this.name = 'EvaluationConflictError';
  }
}

export class FirestoreOperationError extends Error {
  public readonly error: string;
  public readonly operationType: string;
  public readonly path: string | null;
  public readonly code: string | null;
  public readonly authInfo: { userId?: string | null };

  constructor(error: unknown, operationType: string, path: string | null) {
    const message = error instanceof Error ? error.message : String(error);
    super(message);
    this.name = 'FirestoreOperationError';
    this.error = message;
    this.operationType = operationType;
    this.path = path;
    this.code = error instanceof Error && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : null;
    this.authInfo = { userId: auth.currentUser?.uid };
  }

  toInfo(): FirestoreErrorInfo {
    return {
      error: this.error,
      operationType: this.operationType,
      path: this.path,
      code: this.code,
      authInfo: this.authInfo,
    };
  }
}

export function handleFirestoreError(error: unknown, operationType: string, path: string | null): never {
  const err = new FirestoreOperationError(error, operationType, path);
  console.error('Firestore error:', JSON.stringify(err.toInfo()));
  throw err;
}

export function subscribeToMembers(
  onData: (members: TeamMember[]) => void,
  onError?: (error: unknown) => void,
  onInvalidData?: (error: FirestoreDataValidationError) => void,
) {
  const membersRef = collection(db, 'members');
  const membersQuery = query(
    membersRef,
    orderBy('score', 'desc'),
  );

  return onSnapshot(
    membersQuery,
    (snapshot) => {
      const members: TeamMember[] = [];

      snapshot.forEach((memberSnapshot) => {
        try {
          const member = parseTeamMember(memberSnapshot.data(), memberSnapshot.id);
          if (member.deleted === true) return;
          members.push(member);
        } catch (error) {
          if (error instanceof FirestoreDataValidationError) {
            console.error(error.message, error.issues);
            onInvalidData?.(error);
          } else {
            console.error('Unexpected member validation error:', error);
          }
        }
      });

      const rankedMembers = members.map((member, index) => ({
        ...member,
        rank: index + 1,
      }));

      onData(rankedMembers);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function addMemberToFirestore(newMember: TeamMember) {
  try {
    await setDoc(doc(db, 'members', newMember.id), validateTeamMember(newMember));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `members/${newMember.id}`);
  }
}

export async function updateMemberInFirestore(updatedMember: TeamMember) {
  try {
    validateTeamMember(updatedMember);
    await updateDoc(doc(db, 'members', updatedMember.id), {
      // Profile edits must not carry stale score/evaluation fields over a
      // concurrent saveEvaluation transaction.
      name: updatedMember.name,
      role: updatedMember.role,
      team: updatedMember.team,
      teamColor: updatedMember.teamColor,
      avatarUrl: updatedMember.avatarUrl,
      email: updatedMember.email,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `members/${updatedMember.id}`);
  }
}

export async function deleteMemberFromFirestore(memberId: string) {
  try {
    await updateDoc(doc(db, 'members', memberId), {
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: auth.currentUser?.uid || 'unknown',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `members/${memberId}`);
  }
}

export async function restoreMemberFromFirestore(memberId: string) {
  try {
    await updateDoc(doc(db, 'members', memberId), {
      deleted: false,
      deletedAt: deleteField(),
      deletedBy: deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `members/${memberId}`);
  }
}

export async function getArchivedMembersFromFirestore(): Promise<TeamMember[]> {
  try {
    const archivedQuery = query(
      collection(db, 'members'),
      where('deleted', '==', true),
    );
    const snapshot = await getDocs(archivedQuery);
    const archived: TeamMember[] = [];
    snapshot.forEach((memberSnapshot) => {
      try {
        archived.push(parseTeamMember(memberSnapshot.data(), memberSnapshot.id));
      } catch (error) {
        if (error instanceof FirestoreDataValidationError) {
          console.error(error.message, error.issues);
        } else {
          console.error('Unexpected archived member validation error:', error);
        }
      }
    });
    return archived;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'members?deleted=true');
  }
}

export interface EvaluationPayload {
  id: string;
  memberId: string;
  memberName: string;
  leaderName: string;
  score: number;
  status: PerformanceStatus;
  cycle: string;
  comments: string;
  pdiGoals: PdiGoal[];
  criteriaScores: Record<string, number>;
  revision?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function getEvaluationFromFirestore(evaluationId: string): Promise<EvaluationPayload | null> {
  try {
    const snapshot = await getDoc(doc(db, 'evaluations', evaluationId));
    return snapshot.exists() ? parseEvaluationPayload(snapshot.data(), snapshot.id) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `evaluations/${evaluationId}`);
  }
}

export function subscribeToAuditLogs(
  onData: (logs: EvaluationAuditLog[]) => void,
  onError?: (error: unknown) => void,
  maxResults = 200,
) {
  const logsRef = collection(db, 'auditLogs');
  const logsQuery = query(logsRef, orderBy('createdAt', 'desc'), limit(maxResults));

  return onSnapshot(
    logsQuery,
    (snapshot) => {
      const logs: EvaluationAuditLog[] = [];
      snapshot.forEach((logSnapshot) => {
        const data = logSnapshot.data();
        logs.push({
          id: logSnapshot.id,
          action: 'evaluation_saved',
          evaluationId: typeof data.evaluationId === 'string' ? data.evaluationId : '',
          memberId: typeof data.memberId === 'string' ? data.memberId : '',
          memberName: typeof data.memberName === 'string' ? data.memberName : '',
          cycle: typeof data.cycle === 'string' ? data.cycle : '',
          revision: typeof data.revision === 'number' ? data.revision : 0,
          score: typeof data.score === 'number' ? data.score : 0,
          status: (['Voando', 'Caminho Certo', 'Atenção', 'Alarme'] as const).includes(data.status)
            ? data.status
            : 'Atenção',
          previousScore: typeof data.previousScore === 'number' ? data.previousScore : undefined,
          previousStatus: (['Voando', 'Caminho Certo', 'Atenção', 'Alarme'] as const).includes(data.previousStatus)
            ? data.previousStatus
            : undefined,
          actorId: typeof data.actorId === 'string' ? data.actorId : '',
          actorEmail: typeof data.actorEmail === 'string' ? data.actorEmail : '',
          actorName: typeof data.actorName === 'string' ? data.actorName : '',
          createdAt: data.createdAt,
        });
      });
      onData(logs);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function saveEvaluationAndMemberInFirestore({
  member,
  evaluation,
  expectedRevision = 0,
}: {
  member: TeamMember;
  evaluation: EvaluationPayload;
  expectedRevision?: number;
}): Promise<number> {
  try {
    const functions = getFunctions(app, FIREBASE_FUNCTIONS_REGION);
    const callable = httpsCallable<
      {
        member: {
          id: string;
          score: number;
          status: PerformanceStatus;
          evaluationStatus: TeamMember['evaluationStatus'];
          pdiGoals: PdiGoal[];
          history: { month: string; score: number }[];
        };
        evaluation: {
          id: string;
          memberId: string;
          memberName: string;
          leaderName: string;
          score: number;
          status: PerformanceStatus;
          cycle: string;
          comments: string;
          pdiGoals: PdiGoal[];
          criteriaScores: Record<string, number>;
          selfScores?: Record<string, number>;
        };
        expectedRevision: number;
      },
      { revision: number }
    >(functions, 'saveEvaluation');

    const result = await callable({
      member: {
        id: member.id,
        score: member.score,
        status: member.status,
        evaluationStatus: member.evaluationStatus,
        pdiGoals: member.pdiGoals ?? [],
        history: member.history ?? [],
      },
      evaluation: {
        id: evaluation.id,
        memberId: evaluation.memberId,
        memberName: evaluation.memberName,
        leaderName: evaluation.leaderName,
        score: evaluation.score,
        status: evaluation.status,
        cycle: evaluation.cycle,
        comments: evaluation.comments,
        pdiGoals: evaluation.pdiGoals ?? [],
        criteriaScores: evaluation.criteriaScores,
      },
      expectedRevision,
    });
    return result.data.revision;
  } catch (error) {
    if (
      error instanceof FunctionsError &&
      error.code === 'functions/failed-precondition' &&
      error.message.includes('evaluation-conflict')
    ) {
      throw new EvaluationConflictError(evaluation.id, expectedRevision, Number.NaN);
    }
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `saveEvaluation (${member.id}/${evaluation.id})`,
    );
  }
}
