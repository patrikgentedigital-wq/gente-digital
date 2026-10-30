// Edge Function: notas da pesquisa pós-OS por técnico, para a aba "Sucesso do Cliente" (só admin).
// Confere aqui que quem chama é admin e repassa o login dele ao webhook do n8n, que confere de novo
// no Supabase. Não há segredo compartilhado entre os dois. O n8n já entrega sem dado de cliente;
// aqui o corpo é refeito campo a campo mesmo assim.
import { createClient } from 'npm:@supabase/supabase-js@2';

const N8N_URL = 'https://n8n.srv1693737.hstgr.cloud/webhook/sucesso-tecnicos';
const MAX_ROWS = 5000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const text = (value: unknown) => (typeof value === 'string' ? value.slice(0, 200) : '');

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ error: 'nao_autenticado' }, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', userData.user.id).maybeSingle();
  if (profile?.role !== 'admin') return json({ error: 'sem_permissao' }, 403);

  let payload: { geradoEm?: unknown; linhas?: unknown };
  try {
    const response = await fetch(N8N_URL, { headers: { Authorization: authorization }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      console.error('n8n respondeu', response.status);
      return json({ error: 'fonte_indisponivel' }, 502);
    }
    payload = await response.json();
  } catch (error) {
    console.error('Falha ao chamar o n8n', error);
    return json({ error: 'fonte_indisponivel' }, 502);
  }
  if (!Array.isArray(payload.linhas)) return json({ error: 'fonte_indisponivel' }, 502);

  const linhas = payload.linhas.slice(0, MAX_ROWS).map((item: Record<string, unknown>) => ({
    id_os: text(item.id_os),
    id_tecnico: text(item.id_tecnico),
    nome_tecnico: text(item.nome_tecnico),
    data_os: text(item.data_os),
    enviada_em: text(item.enviada_em),
    respondida_em: text(item.respondida_em),
    nota: typeof item.nota === 'number' ? item.nota : 0,
    status: text(item.status),
  }));
  return json({ geradoEm: text(payload.geradoEm), linhas });
});
