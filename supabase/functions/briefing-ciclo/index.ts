// Edge Function: briefing do ciclo de uma equipe (resumo, pontos de atenção e pauta de 1:1).
// A chave da IA fica só aqui (secret OPENAI_API_KEY); o navegador nunca a vê.
// Só quem tem perfil (admin ou líder) chama. A IA recebe números já calculados pelo app e códigos (P1, P2...)
// no lugar dos nomes; os nomes voltam no navegador, depois que a resposta sai daqui.
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = Deno.env.get('BRIEFING_MODEL') ?? Deno.env.get('RASCUNHO_MODEL') ?? 'gpt-4.1-mini';
// Modelos gpt-5 em diante só aceitam chamada de função com o raciocínio desligado neste endpoint.
const REASONING = /^gpt-[5-9]/.test(MODEL) ? { reasoning_effort: 'none' } : {};
const MAX_BODY_BYTES = 30_000;
const MAX_PEOPLE = 60;
const STATUSES = ['Voando', 'Caminho Certo', 'Atenção', 'Alarme'];

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

const SYSTEM = `Você prepara o briefing de um ciclo de avaliação de desempenho para o líder de uma equipe de um provedor de internet, em português do Brasil.
Receberá os números do ciclo já calculados (nota em % do máximo, variação em pontos percentuais contra o ciclo anterior, faixa e mudança de faixa, metas de PDI atrasadas). As faixas, da melhor para a pior, são Voando, Caminho Certo, Atenção e Alarme.
As pessoas aparecem como códigos (P1, P2...). Cite-as exatamente assim, sem inventar nomes.
Use SOMENTE os números recebidos; nunca invente fatos, causas ou notas. Quem tem evaluated=false ainda não foi avaliado no ciclo: não comente nota dele, só lembre que falta avaliar.
Tom profissional, respeitoso e direto. O briefing é para apoiar a conversa individual (1:1): não faça julgamento pessoal e não compare pessoas de forma humilhante.
Entregue: uma manchete de uma frase; até 4 destaques positivos; até 4 pontos de atenção; até 8 pontos de pauta para conversas 1:1 (cada um ligado a uma pessoa, ou à equipe toda com code nulo); até 3 próximos passos.
Termine chamando a ferramenta entregar_briefing.`;

const TOOL = {
  name: 'entregar_briefing',
  description: 'Entrega o briefing do ciclo.',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', description: 'Resumo do ciclo em uma frase.' },
      highlights: { type: 'array', maxItems: 4, items: { type: 'string' } },
      attention: { type: 'array', maxItems: 4, items: { type: 'string' } },
      talkingPoints: {
        type: 'array',
        maxItems: 8,
        items: {
          type: 'object',
          properties: {
            code: { type: ['string', 'null'], description: 'Código da pessoa (P1...) ou null para a equipe toda.' },
            point: { type: 'string', description: 'Ponto de pauta para a conversa 1:1, até 300 caracteres.' },
          },
          required: ['code', 'point'],
        },
      },
      nextSteps: { type: 'array', maxItems: 3, items: { type: 'string' } },
    },
    required: ['headline', 'highlights', 'attention', 'talkingPoints', 'nextSteps'],
  },
};

// Limite de uso por pessoa (cada chamada custa dinheiro na IA). Vale por instância da função: é uma proteção
// simples contra uso em excesso, não uma contagem exata.
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX_CALLS = 10;
const recentCalls = new Map<string, number[]>();
function tooManyCalls(userId: string): boolean {
  const now = Date.now();
  const recent = (recentCalls.get(userId) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_CALLS) {
    recentCalls.set(userId, recent);
    return true;
  }
  recent.push(now);
  recentCalls.set(userId, recent);
  if (recentCalls.size > 500) {
    for (const [id, times] of recentCalls) if (times.every((time) => now - time >= RATE_WINDOW_MS)) recentCalls.delete(id);
  }
  return false;
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const isPercent = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= -100 && value <= 100);
const isStatus = (value: unknown) => value === null || (typeof value === 'string' && STATUSES.includes(value));

function isValidRequest(body: unknown): body is { cycle: string; previousCycle: string | null; summary: Record<string, unknown>; people: Array<Record<string, unknown>> } {
  if (typeof body !== 'object' || body === null) return false;
  const { cycle, previousCycle, summary, people } = body as Record<string, unknown>;
  if (typeof cycle !== 'string' || cycle.length > 64) return false;
  if (previousCycle !== null && (typeof previousCycle !== 'string' || previousCycle.length > 64)) return false;
  if (typeof summary !== 'object' || summary === null) return false;
  if (!Array.isArray(people) || people.length === 0 || people.length > MAX_PEOPLE) return false;
  return people.every((person) => {
    if (typeof person !== 'object' || person === null) return false;
    const p = person as Record<string, unknown>;
    return typeof p.code === 'string' && /^P\d{1,3}$/.test(p.code)
      && typeof p.role === 'string' && p.role.length <= 200
      && typeof p.evaluated === 'boolean'
      && isPercent(p.percent) && isPercent(p.previousPercent) && isPercent(p.delta)
      && isStatus(p.status) && isStatus(p.previousStatus)
      && (p.statusChange === null || ['subiu', 'caiu', 'manteve'].includes(p.statusChange as string))
      && typeof p.overduePdi === 'number' && Number.isInteger(p.overduePdi) && p.overduePdi >= 0 && p.overduePdi <= 100;
  });
}

Deno.serve(async (request) => {
  const cors = corsFor(request);
  const reply = (body: unknown, status = 200) => json(body, status, cors);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return reply({ error: 'ia_nao_configurada' }, 503);

  // Confere que quem chama é um admin ou líder com perfil (a RLS de profiles só devolve a própria linha).
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return reply({ error: 'nao_autenticado' }, 401);
  if (tooManyCalls(userData.user.id)) return reply({ error: 'muitas_chamadas' }, 429);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', userData.user.id).maybeSingle();
  if (!profile) return reply({ error: 'sem_permissao' }, 403);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return reply({ error: 'pedido_grande_demais' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply({ error: 'pedido_invalido' }, 400);
  }
  if (!isValidRequest(body)) return reply({ error: 'pedido_invalido' }, 400);

  const prompt = `Ciclo: ${body.cycle}\nCiclo anterior: ${body.previousCycle ?? 'nenhum (primeiro ciclo)'}\n\nDados (JSON):\n${JSON.stringify({ summary: body.summary, people: body.people })}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 4096, ...REASONING,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
      tools: [{ type: 'function', function: { name: TOOL.name, description: TOOL.description, parameters: TOOL.input_schema } }],
      tool_choice: { type: 'function', function: { name: TOOL.name } },
    }),
  });
  if (!response.ok) {
    console.error('Falha na IA', response.status, await response.text());
    return reply({ error: 'ia_indisponivel' }, 502);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    return reply({ error: 'ia_sem_resposta' }, 502);
  }
  const args = result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (typeof args !== 'string') return reply({ error: 'ia_sem_resposta' }, 502);
  try {
    return reply(JSON.parse(args));
  } catch {
    return reply({ error: 'ia_sem_resposta' }, 502);
  }
});
