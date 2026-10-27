// Camada de dados do app. As telas importam daqui; as funções de membros e avaliação entram nas próximas tarefas.
export {
  getCurrentProfile,
  getCurrentUserRole,
  loginWithEmailAndPassword,
  logoutLeader,
  subscribeToAuth,
} from './auth';
export type { AppProfile, AppRole, AuthUser } from './auth';
