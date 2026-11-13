// Edge Function: contas de acesso ao quadro (só admin). Convida líder ou admin por e-mail, troca a equipe de um
// líder e tira o acesso. A chave de administração do Supabase fica só aqui; o navegador nunca a vê.
// Quem chama precisa ser admin (conferido no banco a cada chamada), e toda mudança vai para o log de auditoria.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRemoveAccess, parseRequest } from './logic.ts';

const SITE_URL = 'https://quadro-desempenho.vercel.app';
const MAX_ACCOUNTS = 1000;

// Só o site do quadro (e o ambiente local) pode chamar esta função a partir do navegador.
const EXTRA_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
function isAllowedOrigin(origin: string): boolean {
  return /^https:\/\/quadro-desempenho[a-z0-9-]*\.vercel\.app$/.test(origin)
    || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    || EXTRA_ORIGINS.includes(origin);
}
function corsFor(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : SITE_URL,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}
function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  const cors = corsFor(request);
  const reply = (body: unknown, status = 200) => json(body, status, cors);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);

  // 1) Quem chama: precisa estar logado e ter perfil de admin.
  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });
  const { data: userData } = await caller.auth.getUser();
  if (!userData.user) return reply({ error: 'nao_autenticado' }, 401);
  const callerId = userData.user.id;
  const { data: callerProfile } = await caller.from('profiles').select('role').eq('user_id', callerId).maybeSingle();
  if (callerProfile?.role !== 'admin') return reply({ error: 'sem_permissao' }, 403);

  // 2) O pedido.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: 'acao_invalida' }, 400);
  }
  const parsed = parseRequest(body);
  if (!parsed.ok) return reply({ error: parsed.error }, 400);
  const command = parsed.value;

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const audit = (action: string, memberId: string, memberName: string) =>
    admin.from('audit_logs').insert({ action, member_id: memberId, member_name: memberName, actor_id: callerId });

  // Equipe de verdade: existe e não é um conjunto individual de perguntas ("Mariza Leite - Danielle").
  const teamExists = async (teamId: string) => {
    if (teamId.includes(' - ')) return false;
    const { data } = await admin.from('teams').select('id').eq('id', teamId).maybeSingle();
    return Boolean(data);
  };

  try {
    if (command.acao === 'listar') {
      const [{ data: profiles }, { data: usersPage }, { data: teams }, { data: history }] = await Promise.all([
        admin.from('profiles').select('user_id, role, team_id, name').limit(MAX_ACCOUNTS),
        admin.auth.admin.listUsers({ page: 1, perPage: MAX_ACCOUNTS }),
        admin.from('teams').select('id').eq('active', true).order('id'),
        admin
          .from('audit_logs')
          .select('id, action, member_name, created_at, actor_id')
          .neq('action', 'evaluation_saved')
          .order('created_at', { ascending: false })
          .limit(30),
      ]);
      const authById = new Map((usersPage?.users ?? []).map((user) => [user.id, user]));
      const accounts = (profiles ?? []).map((profile) => {
        const account = authById.get(profile.user_id);
        return {
          userId: profile.user_id,
          email: account?.email ?? '',
          name: profile.name ?? '',
          role: profile.role,
          teamId: profile.team_id,
          lastSignInAt: account?.last_sign_in_at ?? null,
          confirmed: Boolean(account?.email_confirmed_at || account?.last_sign_in_at),
        };
      });
      const actorEmail = (id: string | null) => (id ? authById.get(id)?.email ?? '' : '');
      return reply({
        accounts,
        teams: (teams ?? []).map((team) => team.id).filter((id) => !id.includes(' - ')),
        history: (history ?? []).map((row) => ({
          id: row.id,
          action: row.action,
          subject: row.member_name ?? '',
          at: row.created_at,
          by: actorEmail(row.actor_id),
        })),
      });
    }

    if (command.acao === 'convidar') {
      if (command.papel === 'leader' && !(await teamExists(command.equipe!))) return reply({ error: 'equipe_inexistente' }, 400);

      // Já existe uma conta de login com este e-mail? Então só liga o perfil, sem mandar outro convite.
      const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: MAX_ACCOUNTS });
      const existing = (usersPage?.users ?? []).find((user) => user.email?.toLowerCase() === command.email);
      let userId = existing?.id ?? null;
      let invited = false;

      if (userId) {
        const { data: hasProfile } = await admin.from('profiles').select('user_id').eq('user_id', userId).maybeSingle();
        if (hasProfile) return reply({ error: 'ja_tem_acesso' }, 409);
      } else {
        const origin = request.headers.get('Origin') ?? '';
        const redirectTo = isAllowedOrigin(origin) && origin.startsWith('https://') ? origin : SITE_URL;
        const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(command.email, {
          data: { name: command.nome },
          redirectTo,
        });
        if (inviteError || !inviteData.user) {
          console.error('Falha ao convidar', inviteError?.message);
          return reply({ error: 'convite_falhou' }, 502);
        }
        userId = inviteData.user.id;
        invited = true;
      }

      const { error: profileError } = await admin.from('profiles').insert({
        user_id: userId,
        role: command.papel,
        team_id: command.equipe,
        name: command.nome,
      });
      if (profileError) {
        console.error('Falha ao criar o perfil', profileError.message);
        if (invited) await admin.auth.admin.deleteUser(userId); // não deixa conta convidada sem perfil
        return reply({ error: 'perfil_falhou' }, 500);
      }
      await audit('leader_invited', userId, `${command.nome} · ${command.papel === 'admin' ? 'admin' : `líder de ${command.equipe}`}`);
      return reply({ ok: true, invited, userId });
    }

    if (command.acao === 'trocar_equipe') {
      const { data: target } = await admin.from('profiles').select('user_id, role, name, team_id').eq('user_id', command.userId).maybeSingle();
      if (!target) return reply({ error: 'usuario_inexistente' }, 404);
      if (target.role !== 'leader') return reply({ error: 'so_lider_tem_equipe' }, 400);
      if (!(await teamExists(command.equipe))) return reply({ error: 'equipe_inexistente' }, 400);
      const { error } = await admin.from('profiles').update({ team_id: command.equipe }).eq('user_id', command.userId);
      if (error) return reply({ error: 'perfil_falhou' }, 500);
      await audit('leader_team_changed', command.userId, `${target.name ?? ''} · ${target.team_id ?? '—'} → ${command.equipe}`);
      return reply({ ok: true });
    }

    // remover_acesso: apaga só o perfil. A conta de login fica guardada; sem perfil, não entra em nada.
    const { data: target } = await admin.from('profiles').select('user_id, role, name').eq('user_id', command.userId).maybeSingle();
    if (!target) return reply({ error: 'usuario_inexistente' }, 404);
    const { data: admins } = await admin.from('profiles').select('user_id').eq('role', 'admin');
    const blocked = checkRemoveAccess({
      callerId,
      targetId: command.userId,
      targetRole: target.role,
      adminIds: (admins ?? []).map((row) => row.user_id),
    });
    if (blocked) return reply({ error: blocked }, 409);
    const { error } = await admin.from('profiles').delete().eq('user_id', command.userId);
    if (error) return reply({ error: 'perfil_falhou' }, 500);
    await audit('leader_access_removed', command.userId, `${target.name ?? ''} · ${target.role}`);
    return reply({ ok: true });
  } catch (error) {
    console.error('gerenciar-lideres', error instanceof Error ? error.message : error);
    return reply({ error: 'erro_interno' }, 500);
  }
});
