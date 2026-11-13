import { getSupabase } from './client';

export interface LeaderAccount {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'leader';
  teamId: string | null;
  lastSignInAt: string | null;
  /** Já entrou ou já confirmou o convite. Falso = convite ainda sem resposta. */
  confirmed: boolean;
}

export interface AccessHistoryEntry {
  id: number;
  action: string;
  subject: string;
  at: string;
  by: string;
}

export interface LeaderOverview {
  accounts: LeaderAccount[];
  teams: string[];
  history: AccessHistoryEntry[];
}

const ERROR_MESSAGES: Record<string, string> = {
  nao_autenticado: 'Sua sessão expirou. Entre de novo.',
  sem_permissao: 'Só o administrador pode gerenciar os acessos.',
  email_invalido: 'Confira o e-mail: ele não parece válido.',
  nome_invalido: 'Informe o nome da pessoa.',
  papel_invalido: 'Escolha se a pessoa é admin ou líder.',
  equipe_obrigatoria: 'Escolha a equipe do líder.',
  equipe_inexistente: 'Essa equipe não existe.',
  ja_tem_acesso: 'Esse e-mail já tem acesso ao quadro.',
  convite_falhou: 'Não foi possível enviar o convite agora. Tente de novo em instantes.',
  perfil_falhou: 'Não foi possível salvar o acesso. Tente de novo.',
  usuario_inexistente: 'Essa conta não existe mais. Atualize a lista.',
  so_lider_tem_equipe: 'Só líderes têm equipe.',
  nao_remover_a_si_mesmo: 'Você não pode tirar o seu próprio acesso.',
  ultimo_admin: 'Não dá para tirar o último administrador.',
  erro_interno: 'Algo deu errado no servidor. Tente de novo.',
};

/** Mensagem em português para o código de erro que a função devolve. */
export function describeLeaderError(code: string | undefined): string {
  return (code && ERROR_MESSAGES[code]) || 'Não foi possível concluir agora. Tente de novo.';
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke('gerenciar-lideres', { body });
  if (error) {
    const response = (error as { context?: Response }).context;
    const payload = response ? ((await response.json().catch(() => undefined)) as { error?: string } | undefined) : undefined;
    throw new Error(describeLeaderError(payload?.error));
  }
  return data as T;
}

export async function listLeaderAccounts(): Promise<LeaderOverview> {
  const data = await call<Partial<LeaderOverview>>({ acao: 'listar' });
  return { accounts: data.accounts ?? [], teams: data.teams ?? [], history: data.history ?? [] };
}

export function inviteLeader(input: { email: string; nome: string; papel: 'admin' | 'leader'; equipe: string | null }): Promise<{ invited: boolean }> {
  return call<{ invited: boolean }>({ acao: 'convidar', ...input });
}

export function changeLeaderTeam(userId: string, equipe: string): Promise<void> {
  return call<void>({ acao: 'trocar_equipe', userId, equipe });
}

export function removeLeaderAccess(userId: string): Promise<void> {
  return call<void>({ acao: 'remover_acesso', userId });
}
