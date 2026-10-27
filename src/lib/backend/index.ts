// Camada de dados do app. As telas importam daqui; as funções de avaliação entram na Tarefa 7.
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
