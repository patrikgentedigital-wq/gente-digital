// Edge Function: assistente de dados para o admin.
// A IA consulta os dados por ferramentas de leitura, sempre com o login de quem perguntou (a RLS vale),
// e só vê códigos (P1, P2...) no lugar dos nomes: os nomes voltam na resposta, depois que ela sai da IA.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildAliases,
  categoriesByTeam,
  collaborators,
  evolution,
  hideNames,
  revealNames,
  teamsByCycle,
  type Dataset,
} from './analytics.ts';

const MODEL = Deno.env.get('ASSISTENTE_MODEL') ?? Deno.env.get('RASCUNHO_MODEL') ?? 'gpt-4.1-mini';
const MAX_BODY_BYTES = 12_000;
const MAX_ROUNDS = 6;
const MAX_ROWS = 5000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `Você é o assistente de dados do Quadro de Desempenho de um provedor de internet. Fala com o administrador, em português do Brasil, de forma direta.
Responda SOMENTE com o que as ferramentas de consulta devolverem; se não houver dado, diga que ainda não há avaliações para isso. Nunca invente números.
Os colaboradores aparecem como códigos (P1, P2...). Cite-os exatamente como vierem, sem alterar.
Os percentuais são a nota dividida pelo máximo da equipe. Compare ciclos na ordem em que as ferramentas os devolvem.
Quando um gráfico ajudar (comparações ou evolução), inclua-o na resposta final. Termine sempre chamando a ferramenta "responder".`;

const FILTER_PROPS = {
  equipe: { type: 'string', description: 'Nome exato da equipe (opcional).' },
  ciclo: { type: 'string', description: 'Ciclo, como "Outubro/2026" (opcional).' },
};

const TOOLS = [
  {
    name: 'consultar_equipes_por_ciclo',
    description: 'Média percentual, avaliados e total de membros por equipe e ciclo.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'consultar_categorias',
    description: 'Média percentual por categoria de perguntas, por equipe e ciclo.',
    parameters: { type: 'object', properties: FILTER_PROPS },
  },
  {
    name: 'consultar_colaboradores',
    description: 'Percentual de cada colaborador (por código) por ciclo, com equipe e cargo.',
    parameters: { type: 'object', properties: FILTER_PROPS },
  },
  {
    name: 'consultar_evolucao',
    description: 'Percentual de um colaborador, ciclo a ciclo.',
    parameters: { type: 'object', properties: { codigo: { type: 'string', description: 'Código, ex.: P3.' } }, required: ['codigo'] },
  },
  {
    name: 'responder',
    description: 'Entrega a resposta final ao administrador, com gráfico opcional.',
    parameters: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Resposta em português, curta e objetiva.' },
        grafico: {
          type: 'object',
          description: 'Gráfico opcional de uma única série.',
          properties: {
            tipo: { type: 'string', enum: ['barras', 'linha'] },
            titulo: { type: 'string' },
            rotulos: { type: 'array', items: { type: 'string' }, maxItems: 30 },
            valores: { type: 'array', items: { type: 'number' }, maxItems: 30 },
            unidade: { type: 'string', description: 'Ex.: %' },
          },
          required: ['tipo', 'titulo', 'rotulos', 'valores'],
        },
      },
      required: ['texto'],
    },
  },
].map((tool) => ({ type: 'function', function: tool }));

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

type ChatTurn = { role: 'user' | 'assistant'; content: string };

function parseTurns(body: unknown): ChatTurn[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const { messages } = body as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 8) return null;
  const turns: ChatTurn[] = [];
  for (const message of messages) {
    if (typeof message !== 'object' || message === null) return null;
    const { role, content } = message as Record<string, unknown>;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim() || content.length > 1000) return null;
    turns.push({ role, content });
  }
  return turns[turns.length - 1].role === 'user' ? turns : null;
}

// deno-lint-ignore no-explicit-any
async function loadDataset(supabase: any): Promise<Dataset> {
  const [teams, members, sets, evaluations] = await Promise.all([
    supabase.from('teams').select('id, name'),
    supabase.from('members').select('id, name, team_id, job_title').is('deleted_at', null),
    supabase.from('criteria_sets').select('team_id, version, categories'),
    supabase
      .from('evaluations')
      .select('member_id, team_id, cycle, criteria_version, scores, score, max_score, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS),
  ]);
  for (const result of [teams, members, sets, evaluations]) if (result.error) throw result.error;
  return {
    teams: teams.data,
    members: members.data.map((m: { id: string; name: string; team_id: string; job_title: string }) => ({
      id: m.id, name: m.name, teamId: m.team_id, jobTitle: m.job_title,
    })),
    criteriaSets: sets.data.map((s: { team_id: string; version: number; categories: Dataset['criteriaSets'][number]['categories'] }) => ({
      teamId: s.team_id, version: s.version, categories: s.categories,
    })),
    evaluations: evaluations.data.map((e: Record<string, unknown>) => ({
      memberId: e.member_id as string, teamId: e.team_id as string, cycle: e.cycle as string,
      criteriaVersion: e.criteria_version as number, scores: (e.scores ?? {}) as Record<string, number>,
      score: e.score as number, maxScore: e.max_score as number, createdAt: e.created_at as string,
    })),
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return json({ error: 'ia_nao_configurada' }, 503);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ error: 'nao_autenticado' }, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', userData.user.id).maybeSingle();
  if (profile?.role !== 'admin') return json({ error: 'sem_permissao' }, 403);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'pedido_grande_demais' }, 413);
  let turns: ChatTurn[] | null = null;
  try {
    turns = parseTurns(JSON.parse(raw));
  } catch {
    turns = null;
  }
  if (!turns) return json({ error: 'pedido_invalido' }, 400);

  let dataset: Dataset;
  try {
    dataset = await loadDataset(supabase);
  } catch (error) {
    console.error('Falha ao ler os dados', error);
    return json({ error: 'dados_indisponiveis' }, 502);
  }
  const aliases = buildAliases(dataset.members);

  // deno-lint-ignore no-explicit-any
  const runTool = (name: string, args: any): unknown => {
    if (name === 'consultar_equipes_por_ciclo') return teamsByCycle(dataset);
    if (name === 'consultar_categorias') return categoriesByTeam(dataset, { teamName: args.equipe, cycle: args.ciclo });
    if (name === 'consultar_colaboradores') return collaborators(dataset, aliases, { teamName: args.equipe, cycle: args.ciclo });
    if (name === 'consultar_evolucao') return evolution(dataset, aliases, String(args.codigo ?? ''));
    return { erro: 'ferramenta desconhecida' };
  };

  // deno-lint-ignore no-explicit-any
  const messages: any[] = [
    { role: 'system', content: SYSTEM },
    ...turns.map((turn) => ({ role: turn.role, content: hideNames(turn.content, dataset.members, aliases) })),
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_completion_tokens: 4096, messages, tools: TOOLS, tool_choice: 'required' }),
    });
    if (!response.ok) {
      console.error('Falha na IA', response.status, await response.text());
      return json({ error: 'ia_indisponivel' }, 502);
    }
    const message = (await response.json()).choices?.[0]?.message;
    const calls = message?.tool_calls;
    if (!Array.isArray(calls) || calls.length === 0) return json({ error: 'ia_sem_resposta' }, 502);

    const final = calls.find((call: { function: { name: string } }) => call.function.name === 'responder');
    if (final) {
      try {
        const { texto, grafico } = JSON.parse(final.function.arguments);
        if (typeof texto !== 'string' || !texto.trim()) return json({ error: 'ia_sem_resposta' }, 502);
        const reveal = (value: string) => revealNames(value, aliases.nameByCode);
        const chart = grafico && Array.isArray(grafico.rotulos) && Array.isArray(grafico.valores) && grafico.rotulos.length === grafico.valores.length
          ? {
              type: grafico.tipo === 'linha' ? 'linha' : 'barras',
              title: reveal(String(grafico.titulo ?? '')),
              labels: grafico.rotulos.map((label: unknown) => reveal(String(label))),
              values: grafico.valores.map((value: unknown) => Number(value) || 0),
              unit: typeof grafico.unidade === 'string' ? grafico.unidade : '',
            }
          : null;
        return json({ text: reveal(texto.trim()), chart });
      } catch {
        return json({ error: 'ia_sem_resposta' }, 502);
      }
    }

    messages.push(message);
    for (const call of calls) {
      let result: unknown;
      try {
        result = runTool(call.function.name, JSON.parse(call.function.arguments || '{}'));
      } catch {
        result = { erro: 'argumentos inválidos' };
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return json({ error: 'ia_sem_resposta' }, 502);
});
