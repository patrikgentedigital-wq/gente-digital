import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PerformanceStatus, TeamMember, PdiGoal } from '../types';

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
export const db = getFirestore(app, firestoreDatabaseId);

export async function loginWithEmailAndPassword(email: string, password: string) {
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
  authInfo: {
    userId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: string, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
    },
    operationType,
    path,
  };

  console.error('Firestore error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function subscribeToMembers(
  onData: (members: TeamMember[]) => void,
  onError?: (error: unknown) => void,
) {
  const membersRef = collection(db, 'members');
  const membersQuery = query(membersRef, orderBy('score', 'desc'));

  return onSnapshot(
    membersQuery,
    (snapshot) => {
      const members: TeamMember[] = [];

      snapshot.forEach((memberSnapshot) => {
        members.push(memberSnapshot.data() as TeamMember);
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
    await setDoc(doc(db, 'members', newMember.id), newMember);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `members/${newMember.id}`);
  }
}

export async function updateMemberInFirestore(updatedMember: TeamMember) {
  try {
    await setDoc(doc(db, 'members', updatedMember.id), {
      ...updatedMember,
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
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function getEvaluationFromFirestore(evaluationId: string): Promise<EvaluationPayload | null> {
  try {
    const snapshot = await getDoc(doc(db, 'evaluations', evaluationId));
    return snapshot.exists() ? (snapshot.data() as EvaluationPayload) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `evaluations/${evaluationId}`);
  }
}

export async function saveEvaluationInFirestore(evaluationData: EvaluationPayload) {
  try {
    await setDoc(doc(db, 'evaluations', evaluationData.id), {
      ...evaluationData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `evaluations/${evaluationData.id}`);
  }
}

export async function saveEvaluationAndMemberInFirestore({
  member,
  evaluation,
}: {
  member: TeamMember;
  evaluation: EvaluationPayload;
}) {
  const memberRef = doc(db, 'members', member.id);
  const evaluationRef = doc(db, 'evaluations', evaluation.id);

  try {
    await runTransaction(db, async (transaction) => {
      const existingMember = await transaction.get(memberRef);
      if (!existingMember.exists()) {
        throw new Error(`Membro ${member.id} não encontrado`);
      }

      transaction.set(memberRef, {
        score: member.score,
        status: member.status,
        evaluationStatus: member.evaluationStatus,
        pdiGoals: member.pdiGoals,
        history: member.history,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      transaction.set(evaluationRef, {
        ...evaluation,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `members/${member.id} + evaluations/${evaluation.id}`,
    );
  }
}
