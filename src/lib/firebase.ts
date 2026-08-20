import { initializeApp } from 'firebase/app';
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
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  doc,
  collection,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { EvaluationAuditLog, PerformanceStatus, TeamMember, PdiGoal } from '../types';
import {
  FirestoreDataValidationError,
  parseEvaluationPayload,
  parseTeamMember,
  validateEvaluationPayload,
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

const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

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
  const membersQuery = query(membersRef, orderBy('score', 'desc'));

  return onSnapshot(
    membersQuery,
    (snapshot) => {
      const members: TeamMember[] = [];

      snapshot.forEach((memberSnapshot) => {
        try {
          members.push(parseTeamMember(memberSnapshot.data(), memberSnapshot.id));
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
    const validatedMember = validateTeamMember(updatedMember);
    await setDoc(doc(db, 'members', updatedMember.id), {
      ...validatedMember,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `members/${updatedMember.id}`);
  }
}

export async function deleteMemberFromFirestore(memberId: string) {
  try {
    await deleteDoc(doc(db, 'members', memberId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `members/${memberId}`);
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
  const memberRef = doc(db, 'members', member.id);
  const evaluationRef = doc(db, 'evaluations', evaluation.id);
  const auditRevision = Math.max(0, expectedRevision) + 1;
  const auditRef = doc(db, 'auditLogs', `audit_${evaluation.id}_${auditRevision}`);

  try {
    const validatedMember = validateTeamMember(member);
    await runTransaction(db, async (transaction) => {
      const existingMember = await transaction.get(memberRef);
      if (!existingMember.exists()) {
        throw new Error(`Membro ${member.id} não encontrado`);
      }

      const existingEvaluation = await transaction.get(evaluationRef);
      const currentRevision = existingEvaluation.exists()
        ? Number(existingEvaluation.data().revision || 0)
        : 0;
      if (!Number.isInteger(currentRevision) || currentRevision !== expectedRevision) {
        throw new EvaluationConflictError(evaluation.id, expectedRevision, currentRevision);
      }

      const persistedEvaluation = validateEvaluationPayload({
        ...evaluation,
        revision: currentRevision + 1,
        ...(existingEvaluation.exists()
          ? {}
          : { createdAt: serverTimestamp() }),
      });
      const previousEvaluation = existingEvaluation.exists() ? existingEvaluation.data() : undefined;
      const auditLog: EvaluationAuditLog = {
        id: auditRef.id,
        action: 'evaluation_saved',
        evaluationId: persistedEvaluation.id,
        memberId: persistedEvaluation.memberId,
        memberName: persistedEvaluation.memberName,
        cycle: persistedEvaluation.cycle,
        revision: persistedEvaluation.revision || currentRevision + 1,
        score: persistedEvaluation.score,
        status: persistedEvaluation.status,
        ...(typeof previousEvaluation?.score === 'number'
          ? { previousScore: previousEvaluation.score }
          : {}),
        ...(previousEvaluation?.status === 'Voando' ||
        previousEvaluation?.status === 'Caminho Certo' ||
        previousEvaluation?.status === 'Atenção' ||
        previousEvaluation?.status === 'Alarme'
          ? { previousStatus: previousEvaluation.status }
          : {}),
        actorId: auth.currentUser?.uid || 'unknown',
        actorEmail: auth.currentUser?.email || '',
        actorName: persistedEvaluation.leaderName,
      };

      transaction.set(memberRef, {
        score: validatedMember.score,
        status: validatedMember.status,
        evaluationStatus: validatedMember.evaluationStatus,
        pdiGoals: validatedMember.pdiGoals,
        history: validatedMember.history,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      transaction.set(evaluationRef, {
        ...persistedEvaluation,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      transaction.set(auditRef, {
        ...auditLog,
        createdAt: serverTimestamp(),
      });
    });
    return auditRevision;
  } catch (error) {
    if (error instanceof EvaluationConflictError) throw error;
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `members/${member.id} + evaluations/${evaluation.id}`,
    );
  }
}
