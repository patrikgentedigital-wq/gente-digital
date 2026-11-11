// Edge Function: notas da pesquisa pós-OS por técnico, para a aba "Sucesso do Cliente" (só admin).
// Confere aqui que quem chama é admin e repassa o login dele ao webhook do n8n, que confere de novo
// no Supabase. Não há segredo compartilhado entre os dois. O n8n já entrega sem dado de cliente;
// aqui o corpo é refeito campo a campo mesmo assim.
import { createClient } from 'npm:@supabase/supabase-js@2';

const N8N_URL = 'https://n8n.srv1693737.hstgr.cloud/webhook/sucesso-tecnicos';
const MAX_ROWS = 5000;

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
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'https://quadro-desempenho.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const text = (value: unknown) => (typeof value === 'string' ? value.slice(0, 200) : '');

Deno.serve(async (request) => {
  const cors = corsFor(request);
  const reply = (body: unknown, status = 200) => json(body, status, cors);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return reply({ error: 'nao_autenticado' }, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', userData.user.id).maybeSingle();
  if (profile?.role !== 'admin') return reply({ error: 'sem_permissao' }, 403);

  let payload: { geradoEm?: unknown; linhas?: unknown };
  try {
    const response = await fetch(N8N_URL, { headers: { Authorization: authorization }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      console.error('n8n respondeu', response.status);
      return reply({ error: 'fonte_indisponivel' }, 502);
    }
    payload = await response.json();
  } catch (error) {
    console.error('Falha ao chamar o n8n', error);
    return reply({ error: 'fonte_indisponivel' }, 502);
  }
  if (!Array.isArray(payload.linhas)) return reply({ error: 'fonte_indisponivel' }, 502);

  const linhas = payload.linhas.slice(0, MAX_ROWS).map((item: Record<string, unknown>) => ({
    id_os: text(item.id_os),
    id_tecnico: text(item.id_tecnico),
    nome_tecnico: text(item.nome_tecnico),
    data_os: text(item.data_os),
    enviada_em: text(item.enviada_em),
    respondida_em: text(item.respondida_em),
    nota: typeof item.nota === 'number' && Number.isFinite(item.nota) ? Math.min(5, Math.max(0, item.nota)) : 0,
    status: text(item.status),
  }));
  return reply({ geradoEm: text(payload.geradoEm), linhas });
});
