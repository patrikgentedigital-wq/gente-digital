// Camada de dados do app. As telas importam daqui.
export {
  getCurrentProfile,
  getCurrentUserRole,
  loginWithEmailAndPassword,
  logoutLeader,
  subscribeToAuth,
} from './auth';
export type { AppProfile, AppRole, AuthUser } from './auth';
export {
  addMemberToFirestore,
  deleteMemberFromFirestore,
  getArchivedMembersFromFirestore,
  listTeams,
  restoreMemberFromFirestore,
  subscribeToAuditLogs,
  subscribeToMembers,
  updateMemberInFirestore,
} from './members';
export { getCriteriaSet, saveCriteriaSet } from './criteria';
export type { CriteriaSet } from './criteria';
export {
  describeEvaluationError,
  getEvaluationFromFirestore,
  isEvaluationConflictError,
  isEvaluationCriteriaOutdatedError,
  saveEvaluationAndMemberInFirestore,
} from './evaluations';
export type { EvaluationPayload, SavedEvaluation } from './evaluations';
