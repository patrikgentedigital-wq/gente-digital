# Auditoria de Riscos — Gente Digital

Data: 2026-08-20 (rev. 2, pós-testes do emulador) · Projeto: `gen-lang-client-0169317507` · Banco Firestore nomeado: `ai-studio-gentedigital-...`

> Este documento foca em **o que pode dar errado** (visão de risco operacional,
> de segurança residual e de produto). A rev. 2 incorpora a validação das Rules
> pelo Firebase Emulator Suite com testes automatizados — que pegou **dois bugs
> de produção** que a revisão manual não viu — e o soft-delete de membros.

---

## 1. O que o emulador já pegou (e por que testes automatizados são obrigatórios)

Ao rodar `firestore.rules` contra o Firestore Emulator com 49 testes
(`npm run test:rules`, emulador real, `@firebase/rules-unit-testing`), dois
achados sérios apareceram **que a revisão manual não detectaria**:

1. **`list.all()` não existe na linguagem de rules do Firestore** (existe só no
   Cloud Storage). A correção A-01 usava `history.all(...)`/`pdiGoals.all(...)` —
   a regra "carrega", mas **toda escrita de membro falharia em produção** com
   `Function not found error: Name: [all]`. Regra corrigida para validação
   estrutural (lista + limite de tamanho).
2. **Orçamento de 1.000 expressões por request** (quota real de produção,
   documentada em firebase.google.com/docs/firestore/quotas). O `validEvaluation`
   original — com `hasOnly`/`hasAll` de 31 chaves + 31 chamadas por critério —
   estourava o limite em **toda criação/atualização de avaliação**, mesmo para
   líder legítimo. Ou seja: **salvar avaliação provavelmente nunca funcionou em
   produção**. Corrigido removendo as 31 chamadas por chave (a integridade do
   conjunto de chaves é mantida com `hasOnly`+`hasAll`; a faixa 0..5 passou a
   ser validada apenas no cliente zod — ver seção 5).

Isso confirma o ponto levantado na revisão: **revisão manual de rules não é
suficiente**. Desde a rev. 2, as rules são testadas automaticamente no CI
(job `firestore-rules`, com `actions/setup-java` Temurin 21).

---

## 2. Matriz de risco (rev. 2)

Legenda: Prob. = probabilidade (A/M/B), Imp. = impacto (A/M/B), Sev. = severidade geral (Crit./Alto/Médio/Baixo).

| # | Risco | Prob. | Imp. | Sev. | Mitigação existente | Gap |
|---|-------|-------|------|------|---------------------|-----|
| R1 | Conta de líder comprometida lê PII de todos e grava avaliações | M | A | **Alto** | Rules exigem login+email verificado; líder não apaga/exclui | Sem MFA; líder vê todos os times; sem App Check |
| R2 | Exclusão de membro apaga histórico irreversivelmente | B | A | **Médio** | **Soft-delete (rev. 2): arquivo reversível + restauração admin** | Purge definitivo existe fora do app (console); backup diário ainda recomendado |
| R3 | Retenção indefinida de PII em `auditLogs`/membros (LGPD) | M | M | **Médio** | Nada expurga registros | Sem política de retenção/deleção |
| R4 | Regra do Firestore publicada com erro derruba escritas em produção | M | A | **Baixo→Médio** | **49 testes no emulador + CI (rev. 2)**; deploy automático em main via `ENABLE_DEPLOY` | Falha residual só se deploy manual fora do CI |
| R5 | `TEAMS_WEBHOOK_URL` ausente deixa alertas silenciosos | A | B | **Baixo** | Trigger faz skip+log se ausente | Ninguém é notificado até configurar |
| R6 | Abuso de escrita por cliente headless (sem App Check) | B | M | **Médio** | Rules validam shape/campos; zod no cliente | Config pública; App Check recomendado (reCAPTCHA v3, grátis) |
| R7 | CSP quebra recursos do app (imagens/estilos) em produção | B | M | **Médio** | CSP restritivo adicionado | Validar no deploy real |
| R8 | Dependências transitivas do `functions` (moderadas) | A | B | **Baixo** | `npm audit` no CI (fail ≥ high) | Moderadas não bloqueiam |
| R9 | Escala: subscriptions de coleção inteira + bundle pesado (recharts) | B | M | **Médio** | Escala atual pequena | `onSnapshot` de `members` inteiro; bundle ~104KB gzip só recharts |
| R10 | Gamificação não chega ao colaborador (P-01 não implementado) | A | M | **Médio** | Kiosk TV + badges para líder | Sem login/visão do colaborador |
| R11 | Alteração de claims fora das Functions (console/scripts) | B | M | **Médio** | Functions protegem self/último-admin | Console Auth pode remover role do último admin manualmente |
| R12 | Sem ambiente de staging/monitoramento de erros | M | M | **Médio** | CI roda lint+test+build+rules | Sem pre-prod, sem alertas de erro de Functions |

---

## 3. Segurança e acesso (residual)

- **R1 — Conta de líder = superfície ampla.** Todos os líderes leem `members`
  completo (nomes, e-mails, scores) de todos os times e gravam avaliações. Uma
  credencial comprometida (sem MFA) permite alterar avaliações de qualquer
  pessoa e expor PII. Ação recomendada: **MFA para contas com role**; avaliar
  filtrar leitura por time (`team == request.auth.token.team`).
- **R6 — App Check ausente.** A config do Firebase é pública por natureza.
  Sem App Check, um cliente scriptado pode gravar documentos que respeitem as
  Rules. Impacto limitado por shape-strict nas rules + zod; vale habilitar App
  Check (reCAPTCHA v3, gratuito) nas escritas.
- **R11 — Bypass administrativo.** Console Firebase Auth e `manage-roles.mjs`
  podem remover a role do último admin. As Functions estão protegidas; os
  caminhos diretos não.
- **Positivo:** rules fail-closed; `email_verified` obrigatório;
  `hasOnly`/`affectedKeys` impedem mass assignment; claims não são
  autoatribuíveis; senhas nunca em argumento CLI.

## 4. Integridade e disponibilidade de dados

- **R2 — Soft-delete implementado (rev. 2).** `deleteMemberFromFirestore` agora
  **arquiva** (marca `deleted: true` + `deletedAt` + `deletedBy`); o histórico
  de avaliações é preservado; listas filtram arquivados; admin restaura pela
  seção "Membros Arquivados" na Trilha de Auditoria. Regras validadas no
  emulador (arquivar/restaurar/negar líder). **Resíduo:** exclusão definitiva
  (purge) continua possível via console Firestore; backup diário do banco
  continua recomendado (erro de operador ou regra mal publicada ainda pode
  causar perda).
- **Concorrência:** transação + `revision` evitam sobrescrita perdida; conflito
  recarrega a avaliação (M-09).
- **Limite de expressões:** rules agora ficam folgadas do orçamento de 1.000;
  os 49 testes cobrem os caminhos de escrita mais caros.

## 5. Limitação técnica documentada (rules + listas)

A linguagem de rules do Firestore **não permite validação elemento a elemento
de listas** (não há `all()`/`any()` nem indexação; `list.all` não existe —
provado no emulador). Portanto:

- `history` e `pdiGoals`: rules garantem **lista + limite de tamanho** (50/100).
  A integridade dos elementos é garantida **no cliente** (schemas zod estritos,
  sem `.passthrough()`).
- `criteriaScores`: rules garantem o **conjunto exato de chaves** (31);
  a faixa de valores 0..5 é garantida **no cliente** (zod).
- Os testes de rules incluem casos que **documentam a limitação** (escrita de
  elemento malformado passa na regra), para que a lacuna não seja esquecida.

**Fechamento definitivo (recomendado, decisão pendente):** migrar o save de
avaliação para uma **Cloud Function callable** (`saveEvaluation`) que valide
tudo com zod no servidor; as regras então negam escrita direta de
`history`/`pdiGoals`/`criteriaScores` por clientes. Custo: o fluxo de save
passa a depender de functions deployadas (hoje o app funciona sem elas) e há
trabalho de refactor (função + cliente + testes + regras).

## 6. Continuidade operacional

- **R4 — Resolvido em grande parte (rev. 2).** Rules testadas no emulador no CI
  (`firestore-rules` job, Java via setup-java) e deploy em `main` via
  `firebase deploy --only hosting,firestore,functions` quando
  `vars.ENABLE_DEPLOY == 'true'`. O gate continua existindo **por motivo
  explícito**: o secret `FIREBASE_SERVICE_ACCOUNT` e a role de IAM ainda não
  foram configurados no GitHub; sem eles o deploy falharia. Até lá, o deploy
  manual (`firebase deploy --only firestore:<database>`) é o caminho.
- **R5 — Webhook Teams.** O trigger só notifica se `TEAMS_WEBHOOK_URL` estiver
  em `functions/.env`. Criar o webhook do Teams e publicar o parâmetro.
- **R12 — Sem staging/monitoramento.** Alertas de erro de Functions no console.

## 7. Privacidade e conformidade (LGPD)

- **R3 — Retenção eterna de PII.** `auditLogs` guarda `memberName`/`actorEmail`
  e nunca é expurgado; `members` guarda e-mails. Recomenda-se: política de
  retenção (expurgar auditLogs antigos), fluxo de anonimização ao excluir, e
  região de dados documentada (`us-central`).
- Soft-delete ajuda: um "esquecimento" pode começar pelo arquivamento +
  anonimização, mantendo apenas o mínimo para integridade do histórico.

## 8. O que precisa de ação EXTERNA (operação/produto)

| Prioridade | Ação | Onde/Como |
|---|---|---|
| Alta | Publicar Rules e Functions (este PR contém correções que afetam produção) | `firebase deploy --only firestore:ai-studio-gentedigital-cb816dee-4739-4dd8-8612-2cfe4702cf93` e `firebase deploy --only functions` (com `functions/.env`: `BOOTSTRAP_ADMIN_EMAIL`, opcional `TEAMS_WEBHOOK_URL`) |
| Alta | Publicar Hosting (`dist/` já buildado) e validar CSP | `firebase deploy --only hosting`; testar avatares, fontes, gráficos |
| Média | Habilitar deploy no CI | Variável `ENABLE_DEPLOY=true` + secret `FIREBASE_SERVICE_ACCOUNT` no GitHub |
| Média | Backup diário do Firestore | Cloud Scheduler → export para GCS |
| Média | MFA obrigatório para contas com role | Console Firebase Auth |
| Média | App Check nas escritas | Firebase Console → App Check → reCAPTCHA v3 |
| Média | Decidir sobre `saveEvaluation` como callable (fechar lacuna de elementos das listas) | Epopeia separada; requer aprovação (muda arquitetura de escrita) |
| Média | P-01: visão do colaborador (`linkedUid` + rule de self-read, **sem usar e-mail como chave** — UID não muda) | Decisão de produto; revisão de segurança da regra |
| Baixa | Teste do PWA em iPhone real (ícones PNG + apple-touch-icon) | Gerar PNGs 192/512/180 e atualizar manifest/index.html |

## 9. O que foi CORRIGIDO e validado nesta rodada (rev. 2)

- **Rules testadas automaticamente** no Firestore Emulator (49 testes, `npm run test:rules`) — validação de auth, roles, membros, evaluations, auditLogs, soft-delete e wildcard.
- **Fix do `list.all()`** (inexistente em rules) — escritas de membro voltam a funcionar.
- **Fix do orçamento de 1.000 expressões** em `validEvaluation`/`validCriteriaScores` — salvar avaliação passa a funcionar.
- **Soft-delete de membros:** arquivar em vez de excluir; restauração admin na Trilha de Auditoria; regras + tipos + schemas + testes.
- **CI:** novo job `firestore-rules` (setup-java Temurin 21) e deploy de `hosting,firestore,functions` em main (gate `ENABLE_DEPLOY`).
- **Java local:** JDK 21 Temurin portátil em `%LOCALAPPDATA%\Temp\opencode\jdk` (resolver o obstáculo do emulador; CI usa setup-java).

Validação executada (rev. 2): `npm run lint` OK (raiz e functions); `npm test` 21/21 (raiz) e 26/26 (functions); `npm run build` OK; `npm run test:rules` 49/49 no emulador.

## 10. Riscos aceitos conscientemente

- Validação de elementos de `history`/`pdiGoals`/faixa de `criteriaScores` apenas no cliente zod (até a decisão do callable `saveEvaluation`).
- Sobreposição de leader/admin ver todas as PII (equipe pequena e de confiança).
- Falta de staging (porte do projeto; CI cobre regressão).
- Dependências moderadas do `functions` (fail no CI apenas para high/critical).