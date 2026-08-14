import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { TeamMember } from '../types';
import { INITIAL_TEAM_MEMBERS } from '../data/initialData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Resolved Firebase configuration with environment variable support & fallback
const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)',
};

const app = initializeApp(resolvedFirebaseConfig);

export const auth = getAuth(app);

// Authentication helper functions
export async function loginWithEmailAndPassword(email: string, pass: string) {
  try {
    return await signInWithEmailAndPassword(auth, email, pass);
  } catch (error: any) {
    // If user not found, attempt sign up automatically for smooth demo / leader onboarding
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        return await createUserWithEmailAndPassword(auth, email, pass);
      } catch (createErr) {
        throw error;
      }
    }
    throw error;
  }
}

export async function loginDemoLeader() {
  try {
    return await signInAnonymously(auth);
  } catch (error) {
    console.warn('Fallback anonymous login error:', error);
  }
}

export async function logoutLeader() {
  return firebaseSignOut(auth);
}

export function subscribeToAuth(onUserChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, onUserChange);
}

// Initialize Firestore with specific database ID from config
export const db = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);

export interface FirestoreErrorInfo {
  error: string;
  operationType: string;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on app load
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'members', '_test_connection_doc_'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore está offline ou incompletamente configurado.');
    }
  }
}
testConnection();

// Seed initial members into Firestore if the collection is empty
export async function seedInitialMembersIfEmpty() {
  const membersRef = collection(db, 'members');
  try {
    const snapshot = await getDocs(membersRef);
    if (snapshot.empty) {
      console.log('Seeding initial members to Firestore...');
      for (const m of INITIAL_TEAM_MEMBERS) {
        await setDoc(doc(db, 'members', m.id), m);
      }
    }
  } catch (err) {
    handleFirestoreError(err, 'write', 'members');
  }
}

// Subscribe to real-time members list from Firestore
export function subscribeToMembers(onData: (members: TeamMember[]) => void) {
  const membersRef = collection(db, 'members');
  const q = query(membersRef, orderBy('score', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        // Seed if empty on snapshot
        seedInitialMembersIfEmpty();
        onData(INITIAL_TEAM_MEMBERS);
        return;
      }
      const list: TeamMember[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as TeamMember);
      });
      // Re-rank dynamically based on score order
      const rankedList = list.map((m, idx) => ({
        ...m,
        rank: idx + 1,
      }));
      onData(rankedList);
    },
    (error) => {
      console.warn('Fallback to local state due to Firestore snapshot error:', error);
      onData(INITIAL_TEAM_MEMBERS);
    }
  );
}

// Add a new member to Firestore
export async function addMemberToFirestore(newMember: TeamMember) {
  try {
    const docRef = doc(db, 'members', newMember.id);
    await setDoc(docRef, newMember);
  } catch (error) {
    handleFirestoreError(error, 'create', `members/${newMember.id}`);
  }
}

// Update a member score/data in Firestore
export async function updateMemberInFirestore(updatedMember: TeamMember) {
  try {
    const docRef = doc(db, 'members', updatedMember.id);
    await setDoc(docRef, updatedMember, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'write', `members/${updatedMember.id}`);
  }
}

// Delete a member from Firestore
export async function deleteMemberFromFirestore(memberId: string) {
  try {
    const docRef = doc(db, 'members', memberId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', `members/${memberId}`);
  }
}

// Save evaluation form in Firestore
export async function saveEvaluationInFirestore(evaluationData: {
  id: string;
  memberId: string;
  memberName: string;
  leaderName: string;
  score: number;
  status: string;
  updatedAt: string;
  cycle?: string;
  comments?: string;
  pdiGoals?: any[];
  criteriaScores?: Record<string, number>;
  selfScores?: Record<string, number>;
}) {
  try {
    const docRef = doc(db, 'evaluations', evaluationData.id);
    await setDoc(docRef, evaluationData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'write', `evaluations/${evaluationData.id}`);
  }
}
