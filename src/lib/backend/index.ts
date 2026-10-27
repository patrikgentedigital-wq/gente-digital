// Camada de dados do app. As telas importam daqui.
export {
  getCurrentProfile,
  getCurrentUserRole,
  loginWithEmailAndPassword,
  initialAuthLink,
  logoutLeader,
  sendPasswordReset,
  subscribeToAuth,
  updatePassword,
} from './auth';
export type { AppProfile, AppRole, AuthUser } from './auth';
export {
  addMember,
  archiveMember,
  getArchivedMembers,
  listTeams,
  restoreMember,
  subscribeToAuditLogs,
  subscribeToMembers,
  updateMember,
} from './members';
export { getCriteriaSet, saveCriteriaSet } from './criteria';
export type { CriteriaSet } from './criteria';
export {
  describeEvaluationError,
  getEvaluation,
  isEvaluationConflictError,
  isEvaluationCriteriaOutdatedError,
  saveEvaluation,
} from './evaluations';
export type { EvaluationPayload, SavedEvaluation } from './evaluations';
