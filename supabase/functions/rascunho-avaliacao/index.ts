// Edge Function: rascunho do parecer e das metas de PDI a partir das notas.
// A chave da IA fica só aqui (secret ANTHROPIC_API_KEY); o navegador nunca a vê.
// Só quem tem perfil (admin ou líder) consegue chamar, e nada que identifique o colaborador chega aqui.
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = Deno.env.get('RASCUNHO_MODEL') ?? 'claude-sonnet-5-5';
const MAX_BODY_BYTES = 20_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `Você ajuda líderes de um provedor de internet a redigir avaliações de desempenho em português do Brasil.
Receberá o cargo e as notas (de 1 a 5) de cada pergunta, agrupadas por categoria.
Escreva um rascunho de parecer da liderança: 3 a 5 frases, tom profissional, respeitoso e direto, citando os pontos fortes (notas altas) e o que precisa melhorar (notas baixas), sem inventar fatos que as notas não mostrem.
Proponha de 1 a 3 metas de desenvolvimento (PDI) concretas, mensuráveis e ligadas às notas mais baixas, cada uma com um prazo curto (ex.: "30 dias", "Próximo ciclo").
Não use nome de pessoa. O líder vai revisar e editar tudo.`;

const TOOL = {
  name: 'entregar_rascunho',
  description: 'Entrega o rascunho do parecer e das metas de PDI.',
  input_schema: {
    type: 'object',
    properties: {
      comment: { type: 'string', description: 'Parecer da liderança, 3 a 5 frases.' },
      goals: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Meta concreta, até 200 caracteres.' },
            deadline: { type: 'string', description: 'Prazo curto, ex.: 30 dias.' },
          },
          required: ['title', 'deadline'],
        },
      },
    },
    required: ['comment', 'goals'],
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function isValidRequest(body: unknown): body is { jobTitle: string; categories: Array<{ name: string; items: Array<{ text: string; score: number }> }> } {
  if (typeof body !== 'object' || body === null) return false;
  const { jobTitle, categories } = body as Record<string, unknown>;
  if (typeof jobTitle !== 'string' || jobTitle.length > 200) return false;
  if (!Array.isArray(categories) || categories.length === 0 || categories.length > 10) return false;
  return categories.every((category) => {
    if (typeof category !== 'object' || category === null) return false;
    const { name, items } = category as Record<string, unknown>;
    if (typeof name !== 'string' || !Array.isArray(items) || items.length === 0 || items.length > 15) return false;
    return items.every((item) => {
      if (typeof item !== 'object' || item === null) return false;
      const { text, score } = item as Record<string, unknown>;
      return typeof text === 'string' && text.length <= 200 && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 5;
    });
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ia_nao_configurada' }, 503);

  // Confere que quem chama é um admin ou líder com perfil (a RLS de profiles só devolve a própria linha).
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ error: 'nao_autenticado' }, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', userData.user.id).maybeSingle();
  if (!profile) return json({ error: 'sem_permissao' }, 403);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'pedido_grande_demais' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'pedido_invalido' }, 400);
  }
  if (!isValidRequest(body)) return json({ error: 'pedido_invalido' }, 400);

  const lines = body.categories.map(
    (category) => `${category.name}:\n${category.items.map((item) => `- ${item.text}: ${item.score}/5`).join('\n')}`,
  );
  const prompt = `Cargo: ${body.jobTitle || 'não informado'}\n\n${lines.join('\n\n')}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    console.error('Falha na IA', response.status, await response.text());
    return json({ error: 'ia_indisponivel' }, 502);
  }

  const result = await response.json();
  const toolUse = (result.content ?? []).find((block: { type: string }) => block.type === 'tool_use');
  if (!toolUse) return json({ error: 'ia_sem_resposta' }, 502);
  return json(toolUse.input);
});
