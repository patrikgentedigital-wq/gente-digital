# Visual "blocos de cor" do Quadro de Desempenho

Data: 2026-11-11 · Situação: aguardando aprovação do usuário

## Objetivo

Deixar o quadro mais moderno e marcante, com a cara da Gente Digital. Hoje ele parece um modelo genérico: branco sobre cinza, título gigante e o resto miúdo, amarelo quase ausente e emojis no lugar de selos.

O usuário escolheu a direção **B, blocos de cor**: claro, contornos pretos grossos, faixa amarela no topo, números grandes em Sora e aparência de cartaz. Decidiu também que **o modo escuro e o modo TV seguem o mesmo estilo** (fundo preto, contornos e destaques amarelos).

Junto com o visual entram três correções de dados que hoje enfeiam e distorcem a tela (ver "Dados").

## Linguagem visual

Tudo sai de `src/index.css`. Os componentes já usam tokens (`bg-surface`, `border-line`, `text-ink`...), então a maior parte da mudança é nos tokens e em poucas utilidades novas.

| Elemento | Claro | Escuro / TV |
| --- | --- | --- |
| Fundo da página | `#f4f3ee` (papel) | `#0b0b0b` |
| Bloco | branco, contorno 2px preto, base 6px preta | `#161616`, contorno 2px `#FFE708`, base 6px |
| Faixa do topo | `#FFE708` com texto preto | preto com texto `#FFE708` |
| Bloco de destaque | preto com número amarelo | amarelo com número preto |
| Apoio | ciano `#39D3CF` (um bloco por tela, no máximo) | igual |
| Títulos e números | Sora 800 | igual |
| Texto | Sen | igual |

Utilidades novas, todas em `index.css`:
- `.blk`: o bloco (contorno 2px, base 6px, cantos 10px).
- `.blk-hero`: o bloco de destaque (preto/amarelo invertido conforme o tema).
- `.band`: a faixa amarela do topo da página.

Regra contra o excesso de peso: o contorno grosso fica só nos blocos de primeiro nível. O que está dentro de um bloco usa no máximo um divisor fino, nunca outro bloco com contorno. Isso elimina o "cartão dentro de cartão dentro de cartão" de hoje.

O canto reto superior esquerdo (`rounded-brand`, vindo da pílula "DIGITAL" da logo) continua nos botões principais.

Emojis (👑, 🥇, 📋) viram ícones do `lucide-react`, que o projeto já usa.

## Por tela

**Cabeçalho (`Navbar.tsx`)**
- O título deixa de ter 60px e passa para cerca de 34px, em caixa alta e Sora 800, dentro da faixa amarela junto com o menu. A frase de subtítulo sai.
- O menu passa a ter Visão geral, Ranking, Equipes e Avaliar. Auditoria, Perguntas, Sucesso do Cliente e Assistente vão para um menu "Gestão" (só para admin e líder, conforme o papel de cada item). Assim o menu cabe em uma linha a 1366px.
- As ações da tela (Exportar, Novo colaborador) ficam na faixa, na mesma linha do título.
- O ciclo vira só um texto ("Últimas avaliações · nov/2026"), sem o ícone de funil. Os dados de hoje não guardam membros por ciclo, então um seletor de verdade fica fora deste trabalho.

**Ranking (`LeaderboardView.tsx`)**
- Pódio: três blocos. O 1º é o `.blk-hero`, o 2º é branco e o 3º ciano. Só entra no pódio quem foi avaliado.
- Lista: linhas com contorno de 2px e sem base grossa, contendo posição, nome, equipe, selo de nível, percentual e "Avaliar". Editar, evolução e PDF vão para um menu "⋯".
- Quem não foi avaliado vai para um bloco recolhido no fim, "Aguardando avaliação (N)", sem posição.

**Visão geral (`DashboardView.tsx` e `dashboard/*`)**
- Indicadores: quatro blocos (média geral em preto, na meta, avaliados com barra de progresso em ciano, equipe destaque).
- `TeamComparisonChart`: as barras passam para a horizontal (Recharts `layout="vertical"`), com preenchimento amarelo, contorno preto e linha tracejada da meta. Equipe sem avaliação aparece tracejada, com "—".
- `StatusDistributionChart`: a rosca vira uma barra única dividida por nível, com legenda, e inclui "Sem avaliação" em cinza listrado.
- `ScoreBucketHistogram`: **sai**. Ele repete a distribuição por nível com outros cortes (93/87/81 contra 90/84/77) e as mesmas cores, o que confunde.
- `HistoricalTrendChart`: mostra um aviso quando não há histórico e tem eixo de 0 a 100 de 20 em 20.
- `TeamAnalyticSummary`: um bloco por equipe, inteiro clicável (abre o ranking filtrado), sem caixas internas e sem o botão repetido.

**Equipes, Avaliar, Perguntas, Auditoria, Sucesso do Cliente, Assistente, modais**
- Recebem os tokens e o `.blk` nos blocos de primeiro nível. Não há mudança de estrutura.

**Modo TV (`KioskModeModal.tsx`)**
- Usa o tema escuro do B. A estrutura atual se mantém.

**Relatório em PDF (`@media print`)**
- Não muda. Continua branco para impressão.

## Dados

1. **"Sem avaliação".** Uma pessoa conta como avaliada quando `evaluationStatus === 'Concluído'`, isto é, quando já tem alguma avaliação salva (ver a seção sobre o que "avaliado" quer dizer hoje). Quem não foi avaliado:
   - não entra na média geral, na média por equipe, no pódio, na posição do ranking nem na contagem por nível;
   - aparece com o selo "Sem avaliação" (cinza) e nota "—".

   Fica numa função pura nova em `src/lib/scoring.ts` (`isEvaluated`), coberta por teste.
2. **Coroa "Destaque do Time".** Em `src/utils/badgeUtils.ts:14`, a coroa passa a exigir que a pessoa tenha sido avaliada e tenha percentual acima de zero. Hoje um empate em 0% dá a coroa para todo mundo.
3. **Iniciais do avatar.** `getInitials` em `src/components/Avatar.tsx` passa a ignorar o que não for letra ("Mari (IA)" → "MI", e não "M(").

## Fora do escopo

- Seletor de ciclo de verdade (exige guardar dados por ciclo).
- Tirar a Mari (IA) do ranking (é uma decisão separada).
- Mudar o cálculo de nível (90/84/77) ou as perguntas.
- Os pendentes técnicos de 09/11 (JWT ao n8n, rascunho após o logout etc.).

## O que o "avaliado" quer dizer hoje

Conferido nas migrações do Supabase: `evaluation_status` nasce "Pendente" e vira "Concluído" na primeira avaliação salva (0002, 0007, 0009). Nada o devolve a "Pendente" quando o ciclo muda. A nota do membro é sempre a da avaliação mais recente.

Portanto, "Sem avaliação" significa **nunca avaliado**, e não "ainda não avaliado neste ciclo". O ranking mostra a última avaliação de cada pessoa. Por isso o texto do ciclo no topo diz "Últimas avaliações · nov/2026" em vez de dar a entender que todas as notas são do ciclo atual. Tratar avaliações por ciclo fica fora deste trabalho, junto com o seletor de ciclo.

## Verificação

- `npm run lint` e `npm test` passam, com testes novos para `isEvaluated`, a regra da coroa e `getInitials`.
- Testes de componentes que dependem de textos ou estrutura alterados (Navbar, Dashboard, Ranking) são ajustados.
- Conferência visual no Chrome do usuário, logado, em 1366px e 1536px e no celular (375px), nos modos claro, escuro e TV, comparando com as prévias aprovadas.
- Publicação na Vercel só com a autorização do usuário.
