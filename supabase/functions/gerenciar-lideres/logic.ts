// Regras puras da função gerenciar-lideres: validar o pedido e proteger contra remover o último admin.
// Fica separado do index.ts para ser testado sem o Deno nem o Supabase.

export type Request =
  | { acao: 'listar' }
  | { acao: 'convidar'; email: string; nome: string; papel: 'admin' | 'leader'; equipe: string | null }
  | { acao: 'trocar_equipe'; userId: string; equipe: string }
  | { acao: 'remover_acesso'; userId: string };

export type ParseResult = { ok: true; value: Request } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL = 254;
const MAX_NAME = 100;
const MAX_ID = 100;

const fail = (error: string): ParseResult => ({ ok: false, error });
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function parseRequest(body: unknown): ParseResult {
  if (!body || typeof body !== 'object') return fail('acao_invalida');
  const data = body as Record<string, unknown>;

  switch (data.acao) {
    case 'listar':
      return { ok: true, value: { acao: 'listar' } };

    case 'convidar': {
      const email = text(data.email).toLowerCase();
      if (!email || email.length > MAX_EMAIL || !EMAIL.test(email)) return fail('email_invalido');
      const nome = text(data.nome);
      if (!nome || nome.length > MAX_NAME) return fail('nome_invalido');
      if (data.papel !== 'admin' && data.papel !== 'leader') return fail('papel_invalido');
      if (data.papel === 'admin') return { ok: true, value: { acao: 'convidar', email, nome, papel: 'admin', equipe: null } };
      const equipe = text(data.equipe);
      if (!equipe || equipe.length > MAX_ID) return fail('equipe_obrigatoria');
      return { ok: true, value: { acao: 'convidar', email, nome, papel: 'leader', equipe } };
    }

    case 'trocar_equipe': {
      const userId = text(data.userId);
      if (!userId || userId.length > MAX_ID) return fail('usuario_invalido');
      const equipe = text(data.equipe);
      if (!equipe || equipe.length > MAX_ID) return fail('equipe_obrigatoria');
      return { ok: true, value: { acao: 'trocar_equipe', userId, equipe } };
    }

    case 'remover_acesso': {
      const userId = text(data.userId);
      if (!userId || userId.length > MAX_ID) return fail('usuario_invalido');
      return { ok: true, value: { acao: 'remover_acesso', userId } };
    }

    default:
      return fail('acao_invalida');
  }
}

/** Código do motivo para recusar a remoção de acesso, ou null quando pode remover. */
export function checkRemoveAccess(input: {
  callerId: string;
  targetId: string;
  targetRole: string;
  adminIds: readonly string[];
}): 'nao_remover_a_si_mesmo' | 'ultimo_admin' | null {
  if (input.callerId === input.targetId) return 'nao_remover_a_si_mesmo';
  if (input.targetRole === 'admin' && input.adminIds.filter((id) => id !== input.targetId).length === 0) return 'ultimo_admin';
  return null;
}
