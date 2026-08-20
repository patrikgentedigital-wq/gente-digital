import type { User } from 'firebase/auth';
import type { EvaluationAuditLog, TeamMember } from '../types';
import type { FirestoreDataValidationError } from './firestoreSchemas';
import type { EvaluationPayload } from './firebase';

type FirebaseModule = typeof import('./firebase');

let firebaseModulePromise: Promise<FirebaseModule> | null = null;

export function loadFirebase(): Promise<FirebaseModule> {
  firebaseModulePromise ??= import('./firebase');
  return firebaseModulePromise;
}

export function subscribeToAuth(onUserChange: (user: User | null) => void): () => void {
  let disposed = false;
  let unsubscribe: (() => void) | undefined;

  void loadFirebase()
    .then((firebase) => {
      if (disposed) return;
      unsubscribe = firebase.subscribeToAuth(onUserChange);
    })
    .catch((error) => {
      console.error('Unable to load Firebase authentication:', error);
      if (!disposed) onUserChange(null);
    });

  return () => {
    disposed = true;
    unsubscribe?.();
  };
}

export async function loginWithEmailAndPassword(email: string, password: string) {
  return (await loadFirebase()).loginWithEmailAndPassword(email, password);
}

export async function getCurrentUserRole(user: User) {
  return (await loadFirebase()).getCurrentUserRole(user);
}

export async function logoutLeader() {
  return (await loadFirebase()).logoutLeader();
}

export function subscribeToMembers(
  onData: (members: TeamMember[]) => void,
  onError?: (error: unknown) => void,
  onInvalidData?: (error: FirestoreDataValidationError) => void,
): () => void {
  let disposed = false;
  let unsubscribe: (() => void) | undefined;

  void loadFirebase()
    .then((firebase) => {
      if (disposed) return;
      unsubscribe = firebase.subscribeToMembers(onData, onError, onInvalidData);
    })
    .catch((error) => {
      if (!disposed) onError?.(error);
    });

  return () => {
    disposed = true;
    unsubscribe?.();
  };
}

export function subscribeToAuditLogs(
  onData: (logs: EvaluationAuditLog[]) => void,
  onError?: (error: unknown) => void,
  maxResults?: number,
): () => void {
  let disposed = false;
  let unsubscribe: (() => void) | undefined;

  void loadFirebase()
    .then((firebase) => {
      if (disposed) return;
      unsubscribe = firebase.subscribeToAuditLogs(onData, onError, maxResults);
    })
    .catch((error) => {
      if (!disposed) onError?.(error);
    });

  return () => {
    disposed = true;
    unsubscribe?.();
  };
}

export async function getEvaluationFromFirestore(evaluationId: string) {
  return (await loadFirebase()).getEvaluationFromFirestore(evaluationId);
}

export async function updateMemberInFirestore(updatedMember: TeamMember) {
  return (await loadFirebase()).updateMemberInFirestore(updatedMember);
}

export async function addMemberToFirestore(newMember: TeamMember) {
  return (await loadFirebase()).addMemberToFirestore(newMember);
}

export async function deleteMemberFromFirestore(memberId: string) {
  return (await loadFirebase()).deleteMemberFromFirestore(memberId);
}

export async function restoreMemberFromFirestore(memberId: string) {
  return (await loadFirebase()).restoreMemberFromFirestore(memberId);
}

export async function getArchivedMembersFromFirestore() {
  return (await loadFirebase()).getArchivedMembersFromFirestore();
}

export async function saveEvaluationAndMemberInFirestore({
  member,
  evaluation,
  expectedRevision,
}: {
  member: TeamMember;
  evaluation: EvaluationPayload;
  expectedRevision?: number;
}) {
  return (await loadFirebase()).saveEvaluationAndMemberInFirestore({
    member,
    evaluation,
    expectedRevision,
  });
}

export function isEvaluationConflictError(error: unknown): boolean {
  return error instanceof Error && error.name === 'EvaluationConflictError';
}

export type { EvaluationPayload } from './firebase';
