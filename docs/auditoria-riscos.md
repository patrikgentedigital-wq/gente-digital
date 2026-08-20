# Auditoria de Riscos — Gente Digital

Data: 2026-08-20 · Projeto: `gen-lang-client-0169317507` · Banco Firestore nomeado: `ai-studio-gentedigital-...` · Hash auditado: `d05ef56`

> Este documento foca em **o que pode dar errado** (visão de risco operacional,
> de segurança residual e de produto). Os achados de código já corrigidos nesta
> rodada estão listados na seção final e no histórico do repositório.

---

## 1. Resumo executivo

O sistema tem base de segurança **boa para o porte atual** (Rules fail-closed,
roles via custom claims, verificação de e-mail como gate, transações com
controle de revisão). Após as correções desta rodada, **não há vulnerabilidade
crítica conhecida explorável remotamente sem credencial válida**.

Os riscos mais relevantes que permanecem **não são bugs** — são decisões de
operação, produto e conformidade:

1. **Insider com conta de líder comprometida** → acesso a PII de todos os membros + escrita de avaliações (sem MFA, sem App Check, sem segregação por time).
2. **Perda irreversível de dados** → exclusão de membro apaga avaliações em cascata e não há backup automatizado nem soft-delete.
3. **Retenção de dados pessoais sem política** → `auditLogs` é imutável e nunca é expurgado (LGPD/anonimização).
4. **Gamificação invisível para o colaborador** (P-01) → risco de produto: o reforço de comportamento não acontece.
5. **Publicação manual das Rules** → uma alteração errada em `firestore.rules` derruba o app em produção sem barreira de CI.

Nenhum desses riscos impede a operação atual, mas todos exigem ação deliberada (operacional ou de produto), detalhada na seção 7.

---

## 2. Matriz de risco

Legenda: Prob. = probabilidade (A/M/B), Imp. = impacto (A/M/B), Sev. = severidade geral (Crit./Alto/Médio/Baixo).

| # | Risco | Prob. | Imp. | Sev. | Mitigação existente | Gap |
|---|-------|-------|------|------|---------------------|-----|
| R1 | Conta de líder comprometida lê PII de todos e grava avaliações | M | A | **Alto** | Rules exigem login+email verificado; líder não apaga/exclui | Sem MFA; líder vê todos os times; sem App Check |
| R2 | Exclusão acidental de membro apaga avaliações e histórico | M | A | **Alto** | `onMemberDeleted` limpa avaliações (intencional); confirm modal | Sem soft-delete, sem backup automatizado do Firestore |
| R3 | Retenção indefinida de PII em `auditLogs`/membros (LGPD) | M | M | **Médio** | Nada expurga registros | Sem política de retenção/deleção; dados pessoais eternos |
| R4 | Regra do Firestore publicada com erro derruba o app em produção | M | A | **Alto** | Regras são fail-closed | Publicação manual; emulador não roda no CI (sem Java) |
| R5 | `TEAMS_WEBHOOK_URL` ausente deixa alertas silenciosos | A | B | **Baixo** | Trigger faz skip+log se ausente | Ninguém é notificado de queda de status até configurar |
| R6 | Abuso de escrita por cliente headless (sem App Check) | B | M | **Médio** | Rules validam shape/campos | Qualquer um com config pública pode gravar docs válidos |
| R7 | CSP quebra recursos do app (imagens/estilos) em produção | B | M | **Médio** | CSP restritivo adicionado | Precisa validar no deploy real (emulador não cobre hosting) |
| R8 | Dependências transitivas do `functions` (7 moderadas no audit) | A | B | **Baixo** | `npm audit` no CI (fail ≥ high) | Moderadas não bloqueiam; atualizar quando possível |
| R9 | Escala: subscriptions de coleção inteira + bundle pesado (recharts) | B | M | **Médio** | Escala atual é pequena (dezenas de membros) | `onSnapshot` de `members` inteiro; bundle ~104KB gzip só recharts |
| R10 | Gamificação não chega ao colaborador (P-01 não implementado) | A | M | **Médio** | Kiosk TV + badges para líder | Sem login/visão do colaborador; tese do produto não opera |
| R11 | Alteração de claims fora das Functions (console/scripts) | B | M | **Médio** | Functions protegem self/último-admin | Console Auth pode remover role do último admin manualmente |
| R12 | Sem ambiente de staging/monitoramento de erros | M | M | **Médio** | CI roda lint+test+build | Sem pre-prod, sem alertas de erro de Functions |

---

## 3. Segurança e acesso (residual)

- **R1 — Conta de líder = superfície ampla.** Todos os líderes leem `members` completo (nomes, e-mails, scores) de todos os times e gravam avaliações. Uma credencial comprometida (sem MFA) permite alterar avaliações de qualquer pessoa e expor PII. Ação recomendada: **exigir MFA para usuários com role**; avaliar filtrar leitura por time no líder (`team == request.auth.token.team`).
- **R6 — App Check ausente.** A config do Firebase é pública por natureza (web). Sem App Check, um cliente scriptado com a config pode gravar documentos que respeitem as Rules (ex.: uma avaliação com shape válido e revision correta). Impacto limitado pela lógica de revisão/transação, mas vale habilitar App Check (reCAPTCHA) na escrita.
- **R11 — Bypass administrativo.** O console Firebase Auth e o `manage-roles.mjs` (IAM/gcloud) podem remover a role do último admin, travando o bootstrap futuro. As Functions estão protegidas; os caminhos diretos não. Ação: processo/documento alertando; auditoria periódica de claims.
- **Positivo já validado:** Rules fail-closed em `/{document=**}`; `email_verified` obrigatório; `hasOnly`/`affectedKeys` impedem mass assignment; claims não são autoatribuíveis; senhas nunca mais em argumento CLI.

## 4. Integridade e disponibilidade de dados

- **R2 — Sem backup.** Não há exportação agendada do Firestore para GCS nem soft-delete de membros. A exclusão em cascata (`onMemberDeleted`) é intencional, mas irreversível. Ação: configurar **backup diário automático do Firestore** (Cloud Scheduler + export) e definir janela de recuperação.
- **Concorrência controlada:** transação + `revision` evitam sobrescrita perdida; após conflito o app agora recarrega automaticamente (fix M-09). Resíduo: offline persistence (`persistentLocalCache`) permite editar com dados velhos — o conflito na hora do save já protege.
- **Mudança de schema:** `firestore.rules` e Zod evoluem juntos (times, status, dueDate). Regra prática: alterar ambos no mesmo PR e **publicar rules e funções no mesmo deploy** para não quebrar clientes antigos.

## 5. Continuidade operacional

- **R4 — Publicação manual de Rules.** Sem Java no ambiente não dá para validar `firestore.rules` no emulador localmente; o CI não cobre rules. Ação: adicionar no CI um job que rode `firebase emulators:exec` (imagem com Java) apenas no deploy, ou um `rules-unit-testing` mínimo; no mínimo, checklist manual antes de `firebase deploy --only firestore`.
- **R5 — Webhook Teams.** O trigger `onMemberStatusChanged` só notifica se `TEAMS_WEBHOOK_URL` estiver em `functions/.env`. Sem isso, as quedas continuam silenciosas. Ação: criar o webhook do Teams e publicar o parâmetro.
- **R12 — Sem staging/monitoramento.** O app aponta direto para produção. Recomenda-se: ambiente de staging separado (ou ao menos testar com emulador), e alertas de erro no Firebase Console/Cloud Monitoring (functions > errors).

## 6. Privacidade e conformidade (LGPD)

- **R3 — Retenção eterna de PII.** `auditLogs` guarda `memberName`, `actorEmail` e nunca é expurgado; `members` guarda e-mails. Para um ISP brasileiro tratando dados de colaboradores, convém: (a) política de retenção definida (ex.: expurgar auditLogs > X anos); (b) fluxo de "esquecer" o colaborador (anonimizar nome/e-mail ao excluir); (c) registrar base legal do processamento. As Rules já restringem leitura a admin para auditLogs — bom, mas não resolve retenção.
- PII fica em `us-central` (padrão do projeto) — documentar a região no DPA.

## 7. O que precisa de ação EXTERNA (não é bug, é operação/produto)

| Prioridade | Ação | Onde/Como |
|---|---|---|
| Alta | Publicar Rules e Functions após este PR | `firebase deploy --only firestore:ai-studio-gentedigital-cb816dee-4739-4dd8-8612-2cfe4702cf93` e `firebase deploy --only functions` (com `functions/.env` com `BOOTSTRAP_ADMIN_EMAIL` e opcionalmente `TEAMS_WEBHOOK_URL`) |
| Alta | Publicar Hosting (o `dist/` já foi buildado) e validar CSP em produção | `firebase deploy --only hosting`; testar avatares, fontes, gráficos |
| Média | Habilitar deploy no CI | Variável `ENABLE_DEPLOY=true` + secret `FIREBASE_SERVICE_ACCOUNT` no GitHub |
| Média | Backup diário do Firestore | Cloud Scheduler → export para GCS |
| Média | MFA obrigatório para contas com role | Console Firebase Auth (configuração de MFA) + revisão de política |
| Média | App Check nas escritas | Firebase Console → App Check → reCAPTCHA |
| Média | P-01: visão do colaborador (login próprio + `linkedUid` + rule de self-read) | Decisão de produto; implica revisão de segurança da regra de leitura individual (epopeia separada) |
| Baixa | Teste em iPhone real do PWA (ícones SVG vs PNG + apple-touch-icon) | Gerar PNGs 192/512/180 e atualizar manifest/index.html |

## 8. O que foi CORRIGIDO e validado nesta rodada (commit `d05ef56`)

- **A-01** Rules: validação por elemento de `history` e `pdiGoals` (`validHistoryEntry`/`validPdiGoal`) — líder não corrompe mais o doc.
- **A-02** Rules: `cycle` imutável em update de avaliação — unicidade membro/ciclo preservada.
- **M-01/M-02** `manage-roles.mjs`: role obrigatória em `create-user`; remoção do `emailVerified: true` forçado.
- **M-06** `setUserRole`: impede auto-remoção e remoção do último admin.
- **M-07** Zod: `.passthrough()` → strip (campos extras deixam de ser propagados em reescrita).
- **M-08** CSP restritivo no Hosting.
- **M-09** Conflito de revisão recarrega a avaliação automaticamente.
- **M-10** Erros do Firestore tipados (`FirestoreOperationError` com code/operationType/path).
- **M-03** CI/CD: lint+test+build+audit (app e functions) + deploy opcional de hosting.
- **M-05** Testes dos handlers: 18 novos casos (auth, roles, bootstrap, webhook) → total 26 testes em functions, 21 no app.
- **L-03/L-05/L-06/L-11** badge growth, e-mail não fabricado, senha via prompt, leaderName truncado.
- **P-02** Tela "Trilha de Auditoria" (admin) lendo `auditLogs`.
- **P-03** Trigger `onMemberStatusChanged` + webhook Teams.
- **P-04** PDI com `dueDate` e selo "Vencida".
- **P-06** Slide de reconhecimento ("quem subiu de nível") no Kiosk.
- **L-01/L-02** `metadata.json` e `firebase-blueprint.json` atualizados; runbook revisado.

Validação executada: `lint` (tsc --noEmit) OK na raiz e em functions; `npm test` 21/21 na raiz e 26/26 em functions; `npm run build` OK. **Nota:** as Rules não foram validadas no emulador (Java ausente) — revisão manual feita; publicar e testar em produção.

## 9. Riscos aceitos conscientemente

- Sobreposição de leader/admin ver todas as PII (aceito enquanto a equipe é pequena e de confiança).
- Falta de staging (aceito pelo porte; CI cobre regressão de build/teste).
- Dependências moderadas do `functions` (aceitas; fail no CI apenas para high/critical).