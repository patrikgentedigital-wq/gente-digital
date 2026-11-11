# Visual "blocos de cor" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Quadro de Desempenho o visual "blocos de cor" (claro, escuro e TV) e corrigir os dados que hoje distorcem a tela (quem nunca foi avaliado, a coroa e as iniciais).

**Architecture:** Primeiro as regras de dados viram funções puras testadas (`isEvaluated`, `dashboardStats`, selos, iniciais). Depois o visual entra pelos tokens e por três utilidades em `src/index.css`. Por fim cada tela troca as classes e a estrutura descritas no spec. Nada muda no Supabase.

**Tech Stack:** React 19, TypeScript, Tailwind 4 (`@theme` em `src/index.css`), Recharts 3, lucide-react, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-11-visual-blocos-de-cor-design.md`

## Global Constraints

- Trabalhar no branch `visual-blocos` (criado a partir de `main`). Commits locais a cada tarefa; **sem push e sem deploy** sem autorização do usuário.
- Cores: papel `#f4f3ee`, amarelo `#FFE708`, preto `#000`/`#0b0b0b`, bloco escuro `#161616`, ciano `#39D3CF` (no máximo um bloco ciano por tela).
- Bloco: contorno 2px, base 6px, cantos 10px. O contorno grosso só nos blocos de primeiro nível; dentro de um bloco, no máximo um divisor fino.
- Títulos e números em Sora 800; texto em Sen. O canto reto `rounded-brand` continua nos botões principais.
- Nenhum emoji na interface; os ícones vêm do `lucide-react`.
- "Avaliado" = `evaluationStatus === 'Concluído'`. Quem não foi avaliado não entra em média, pódio, posição nem contagem por nível.
- O `@media print` (relatório PDF) não muda.
- Textos em português do Brasil, só com a primeira letra maiúscula nos rótulos ("Novo colaborador", "Exportar CSV").
- `npm run lint` e `npm test` precisam passar ao fim de cada tarefa.

## Review Focus

- Equipe em que ninguém foi avaliado: a média aparece como "—" (não 0%), a barra fica tracejada e a equipe não pode ser a "equipe destaque". Teste na Tarefa 2.
- Ninguém avaliado: sem pódio, média "—", só "Sem avaliação" na distribuição e nenhuma divisão por zero. Testes nas Tarefas 2 e 5.
- Avaliado com nota 0 (`Concluído`, score 0): conta como avaliado, fica em "Alarme" e não ganha a coroa. Testes nas Tarefas 1 e 2.
- Busca ou filtro em que só aparecem pessoas não avaliadas: a tela mostra o bloco "Aguardando avaliação", e não "Nenhum colaborador encontrado". Teste na Tarefa 5.
- Líder (não admin): o menu "Gestão" não aparece com um item só; "Perguntas" fica direto no menu e nada estoura a largura de 375px. Teste na Tarefa 4.

---

### Task 1: Regras de dados (avaliado, selos e iniciais)

**Files:**
- Modify: `src/lib/scoring.ts`, `src/utils/badgeUtils.ts:12-16` e o selo `podium` (~linha 45), `src/components/Avatar.tsx` (`getInitials`)
- Test: `src/lib/scoring.test.ts`, `src/utils/badgeUtils.test.ts`, criar `src/components/Avatar.test.tsx`

**Interfaces:**
- Produces: `isEvaluated(member: Pick<TeamMember, 'evaluationStatus'>): boolean` em `src/lib/scoring.ts`.

- [ ] **Step 1: Criar o branch:** `git switch -c visual-blocos`
- [ ] **Step 2: Escrever os testes que falham**
  - `scoring.test.ts`: `isEvaluated` é verdadeiro só para `'Concluído'`; falso para `'Pendente'` e `'Forms Respondido'`.
  - `badgeUtils.test.ts`:
    - `'ninguém ganha a coroa num empate em 0%'`: dois membros da mesma equipe com score 0, um `Concluído` e outro `Pendente`; `team_leader.unlocked === false` para os dois.
    - `'quem não foi avaliado não ganha coroa nem pódio'`: membro `Pendente` com rank 2 e score 0; `team_leader` e `podium` não desbloqueados.
    - `'a coroa compara só com colegas avaliados'`: avaliado com 80% e colega `Pendente` com score 0; o avaliado tem a coroa.
  - `Avatar.test.tsx`: `getInitials('Mari (IA)') === 'MI'`, `getInitials('João Lucas') === 'JL'`, `getInitials('  ') === ''`.
- [ ] **Step 3: Rodar** `npx vitest run src/lib/scoring.test.ts src/utils/badgeUtils.test.ts src/components/Avatar.test.tsx`. Esperado: os testes novos falham.
- [ ] **Step 4: Implementar.**
  - `isEvaluated`.
  - `isTeamLeader` exige `isEvaluated(member)` e `myPercent > 0`, e compara só com os colegas avaliados.
  - `podium` exige `isEvaluated(member) && member.rank <= 3`.
  - `getInitials` pega a primeira letra de cada palavra que tenha letra (`/\p{L}/u`), ignorando símbolos.
- [ ] **Step 5: Rodar** o mesmo comando. Esperado: PASS, e os testes antigos continuam passando.
- [ ] **Step 6: Commit** `feat: regras de avaliado, coroa, pódio e iniciais`

### Task 2: Números da Visão geral numa função pura

**Files:**
- Create: `src/lib/dashboardStats.ts`, `src/lib/dashboardStats.test.ts`
- Modify: `src/components/DashboardView.tsx` (o `useMemo` passa a chamar `dashboardStats`)

**Interfaces:**
- Consumes: `isEvaluated`, `percentOf`, `compareByPercent` (`src/lib/scoring.ts`), `deriveTeams`, `TEAMS`.
- Produces:
```ts
export type LevelKey = PerformanceStatus | 'Sem avaliação';
export interface TeamStat { leader: string; color: string; count: number; evaluatedCount: number; avgPercent: number | null; topMember: TeamMember | null; onTargetCount: number }
export interface DashboardStats {
  totalMembers: number; evaluatedCount: number;
  avgPercent: number | null;            // média só dos avaliados, arredondada
  onTargetCount: number;                // avaliados com status 'Voando'
  levelCounts: Record<LevelKey, number>;
  teamStats: TeamStat[];                // ordem: avgPercent desc, null por último
  bestTeam: TeamStat | null;            // maior avgPercent > 0
}
export function dashboardStats(members: TeamMember[]): DashboardStats;
```

- [ ] **Step 1: Escrever os testes que falham** em `dashboardStats.test.ts`:
  - `'ignora quem não foi avaliado na média'`: avaliados 90% e 80% e um `Pendente`; `avgPercent === 85` e `evaluatedCount === 2`.
  - `'ninguém avaliado'`: `avgPercent === null`, `bestTeam === null`, `levelCounts['Sem avaliação'] === total` e os demais 0.
  - `'equipe sem avaliados tem média null e fica por último'`.
  - `'avaliado com nota 0 conta em Alarme'`.
  - `'topMember é o melhor avaliado da equipe, ou null'`.
- [ ] **Step 2: Rodar** `npx vitest run src/lib/dashboardStats.test.ts`. Esperado: FAIL (módulo não existe).
- [ ] **Step 3: Implementar** `dashboardStats` e trocar o `useMemo` do `DashboardView` para usá-la. Os componentes filhos só mudam na Tarefa 6; até lá, `null` é exibido como 0.
- [ ] **Step 4: Rodar** `npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: estatísticas da visão geral sem os não avaliados`

### Task 3: Tokens e utilidades do estilo B

**Files:**
- Modify: `src/index.css` (`@theme`, `.theme-dark`, `.theme-dark-app` e utilidades novas)

**Interfaces:**
- Produces: as classes `blk`, `blk-hero` e `band`, mais os tokens `--color-block-edge` (preto no claro, `#FFE708` no escuro) e `--color-band` / `--color-band-ink` (amarelo/preto no claro, preto/amarelo no escuro).

- [ ] **Step 1: Ajustar os tokens.**
  - Claro: `--color-app: #f4f3ee`, `--color-surface: #ffffff`, `--color-line: #000000`.
  - Escuro: `--color-app: #0b0b0b`, `--color-surface: #161616`, `--color-line: #FFE708`.
  - `--color-line-soft` continua cinza (divisor fino).
- [ ] **Step 2: Criar as utilidades.**
  - `@utility blk`: `border: 2px solid var(--color-block-edge)`, `border-bottom-width: 6px`, `border-radius: 10px`, `background: var(--color-surface)`.
  - `@utility blk-hero`: fundo `var(--color-band-ink)`, texto `var(--color-band)`, mesmo contorno.
  - `@utility band`: fundo `var(--color-band)`, texto `var(--color-band-ink)`, `border-bottom: 2px solid var(--color-block-edge)`.
- [ ] **Step 3: Conferir** `npm run lint && npm run build`. Esperado: sem erros. Abrir `npm run dev` e ver que o site carrega nos dois temas (ainda com a estrutura antiga).
- [ ] **Step 4: Commit** `feat: tokens e blocos do estilo B`

### Task 4: Cabeçalho, faixa e menu Gestão

**Files:**
- Modify: `src/components/Navbar.tsx` (sai o bloco do título, linhas 177-184; o mapa `HERO` vai para o PageHeader), `src/App.tsx` (renderiza `PageHeader` nas abas que não são ranking nem dashboard)
- Create: `src/components/PageHeader.tsx`
- Test: `src/components/Navbar.test.tsx`, criar `src/components/PageHeader.test.tsx`

**Interfaces:**
- Produces: `PageHeader({ tab: Tab; meta?: string; actions?: React.ReactNode })`, que mostra o título de `PAGE_TITLES[tab]` em caixa alta (Sora 800, ~34px) numa faixa `band`, com `actions` à direita na mesma linha. Também exporta `PAGE_TITLES: Record<Tab, string>` e o tipo `Tab`.

- [ ] **Step 1: Escrever os testes que falham.**
  - Navbar, admin: o menu principal tem Visão geral, Ranking, Equipes e Avaliar. Um botão "Gestão" abre Auditoria, Perguntas, Sucesso do Cliente e Assistente. O aviso de erros abertos aparece no botão "Gestão" e no item Auditoria.
  - Navbar, líder: não há botão "Gestão" e "Perguntas" aparece direto no menu.
  - Navbar: não existe mais o texto "Novo membro"; o botão diz "Novo colaborador".
  - PageHeader: mostra o título da aba, o `meta` e os `actions` recebidos.
- [ ] **Step 2: Rodar** `npx vitest run src/components/Navbar.test.tsx src/components/PageHeader.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - Navbar: barra `band` fixa no topo. "Gestão" é um menu suspenso com botões, que fecha com Esc e com clique fora, e só aparece com 2 ou mais itens.
  - PageHeader conforme a interface.
  - App: renderiza `<PageHeader tab={activeTab} />` antes do conteúdo das abas, exceto `ranking` e `dashboard`.
- [ ] **Step 4: Rodar** `npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: faixa amarela, título compacto e menu Gestão`

### Task 5: Ranking em blocos

**Files:**
- Modify: `src/components/LeaderboardView.tsx`
- Create: `src/components/LeaderboardView.test.tsx`

**Interfaces:**
- Consumes: `isEvaluated` (Tarefa 1) e `PageHeader` (Tarefa 4).

- [ ] **Step 1: Escrever os testes que falham.**
  - `'não avaliados ficam no bloco Aguardando avaliação, sem posição'`.
  - `'sem ninguém avaliado não há pódio'`.
  - `'busca que só encontra não avaliados mostra o bloco, não a mensagem de vazio'`.
  - `'editar, evolução e PDF ficam no menu ⋯'`: os botões com esses títulos só aparecem depois de abrir o menu de uma linha.
- [ ] **Step 2: Rodar** `npx vitest run src/components/LeaderboardView.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - Topo: `<PageHeader tab="ranking" meta="Últimas avaliações · {ciclo}" actions={Exportar CSV + Novo colaborador} />`.
  - Pódio só com avaliados: o 1º em `blk-hero`, o 2º em `blk` e o 3º em `blk` com fundo ciano.
  - Linhas avaliadas: contorno 2px sem base grossa, com posição, avatar, nome, equipe, selo de nível, percentual, "Avaliar" e o menu "⋯".
  - Não avaliados num `<details>` "Aguardando avaliação (N)", recolhido, com o selo cinza "Sem avaliação" e a nota "—".
  - Os filtros de nível se aplicam só aos avaliados.
  - Os selos-emoji viram ícones lucide (`Crown`, `Award`, `ClipboardCheck`).
- [ ] **Step 4: Rodar** `npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: ranking em blocos com aguardando avaliação`

### Task 6: Visão geral em blocos

**Files:**
- Modify: `src/components/DashboardView.tsx` e `src/components/dashboard/{DashboardKpiCards,TeamComparisonChart,StatusDistributionChart,HistoricalTrendChart,TeamAnalyticSummary}.tsx`
- Delete: `src/components/dashboard/ScoreBucketHistogram.tsx`
- Create: `src/components/DashboardView.test.tsx`

**Interfaces:**
- Consumes: `DashboardStats` e `TeamStat` (Tarefa 2), `PageHeader` (Tarefa 4).

- [ ] **Step 1: Escrever os testes que falham.**
  - `'mostra — na média quando ninguém foi avaliado'`.
  - `'a distribuição lista Sem avaliação com a contagem'`.
  - `'não existe mais Concentração por Faixa'`.
  - `'clicar no bloco de uma equipe chama onSelectTeamFilter com o líder'`.
  - `'evolução sem histórico mostra aviso'`.
- [ ] **Step 2: Rodar** `npx vitest run src/components/DashboardView.test.tsx`. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - Topo: `<PageHeader tab="dashboard" meta="Últimas avaliações · {ciclo}" actions={Exportar} />`.
  - Indicadores, em quatro `blk`:
    - média geral em `blk-hero` ("—" quando `null`, com "dos N avaliados");
    - na meta;
    - avaliados N/total em fundo ciano, com barra de progresso;
    - equipe destaque.
  - `TeamComparisonChart`: Recharts `layout="vertical"`, barra amarela com contorno preto, `ReferenceLine x={90}` tracejada. Equipe com `avgPercent === null` mostra o trilho tracejado e "—".
  - `StatusDistributionChart`: barra única dividida em cinco partes (Voando, Caminho certo, Atenção, Alarme e Sem avaliação, esta em cinza listrado) com legenda e contagens.
  - `HistoricalTrendChart`: aviso "Ainda não há histórico para mostrar" quando não há pontos, e eixo Y `domain={[0,100]}` com `ticks={[0,20,40,60,80,100]}`.
  - `TeamAnalyticSummary`: cada equipe é um `<button>` com `blk`, sem caixas internas e sem o botão "Ver Integrantes no Ranking".
  - Remover o import e o uso do histograma.
- [ ] **Step 4: Rodar** `npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: visão geral em blocos`

### Task 7: Demais telas, modais e modo TV

**Files:**
- Modify: `TeamsView.tsx`, `EvaluationView.tsx`, `CriteriaEditorView.tsx`, `AuditLogsView.tsx`, `ClientErrorsPanel.tsx`, `SuccessView.tsx`, `AssistantView.tsx`, `EmployeeDetailModal.tsx`, `MemberFormModal.tsx`, `LeaderLoginModal.tsx`, `InfoModal.tsx`, `ConfirmModal.tsx`, `ImageLinkModal.tsx`, `ReportExportModal.tsx` (só fora do `report-print-*`), `KioskModeModal.tsx` e `App.tsx` (os dois cartões de acesso e o rodapé)
- Test: os testes existentes desses componentes

**Interfaces:**
- Consumes: `blk`, `blk-hero` e `band` (Tarefa 3) e `isEvaluated` (Tarefa 1).

- [ ] **Step 1: Escrever o teste que falha** em `src/lib/kioskSlides.test.ts` ou num teste novo do Kiosk: `'o modo TV ranqueia só avaliados'`. Para isso, extrair a ordenação do Kiosk (`KioskModeModal.tsx:95`) para `rankedForKiosk(members: TeamMember[]): TeamMember[]` em `src/lib/kioskSlides.ts`. Pela mesma regra, o "destaque" da `TeamsView` só considera avaliados.
- [ ] **Step 2: Rodar o teste.** Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - Trocar os contêineres de primeiro nível (`rounded-2xl/3xl border border-line bg-surface`) por `blk` e tirar bordas e caixas internas aninhadas.
  - Trocar emojis por ícones lucide.
  - O Kiosk usa `rankedForKiosk` e mantém a classe `theme-dark`, que agora já é o escuro do B.
- [ ] **Step 4: Rodar** `npm run lint && npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: estilo B nas demais telas, modais e modo TV`

### Task 8: Verificação final

- [ ] **Step 1:** `npm run lint && npm test && npm run build`. Esperado: tudo verde.
- [ ] **Step 2:** `npm run test:e2e`, se os testes Playwright existentes rodarem localmente. Anotar o que não pôde rodar.
- [ ] **Step 3: Conferência visual** com `npm run dev` no Chrome do usuário, logado com a conta dele.
  - Larguras: 1366, 1536 e 375px.
  - Modos: claro, escuro e TV.
  - Telas: Ranking, Visão geral, Equipes, Avaliar e os itens de Gestão.
  - Comparar com as prévias aprovadas: faixa amarela, blocos, "Sem avaliação", nenhuma coroa em quem tem 0% e "MI" na Mari (IA).
- [ ] **Step 4:** Registrar o resultado no Obsidian (`01_Inbox`). Perguntar ao usuário sobre o push e o deploy na Vercel; não fazer nenhum dos dois sem um sim.
