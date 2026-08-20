# Auditoria de Riscos — Gente Digital

Data: 2026-08-20 (rev. 3, callable saveEvaluation) · Projeto: `gen-lang-client-0169317507` · Banco Firestore nomeado: `ai-studio-gentedigital-...`

> Este documento foca em **o que pode dar errado**. A rev. 3 fecha a última
> lacuna de integridade: o save de avaliações agora passa pela **Cloud Function
> callable `saveEvaluation`** com validação zod elemento a elemento no servidor,
> e as Firestore Rules proíbem escrita direta de avaliações/auditLogs por
> clientes.

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

## 5. Arquitetura de escrita (rev. 3) — lacuna de elementos FECHADA

Antes da rev. 3, `history`/`pdiGoals`/`criteriaScores` eram validados apenas no
cliente (zod), porque as rules não conseguem validar elementos de listas e o
limite de 1.000 expressões impedia validação pesada. Agora:

- **Todo o fluxo de salvar avaliação** passa pela callable `saveEvaluation`
  (`functions/src/index.ts`), que valida com zod **no servidor**, elemento a
  elemento: pdiGoals (chaves/status/dueDate), history (tipos/faixas),
  criteriaScores (31 chaves exatas, 0..5), consistência score↔status e
  score↔score entre avaliação e membro, além da checagem otimista de revisão.
- **Rules endurecidas**: clientes não escrevem mais `evaluations` nem
  `auditLogs`; líderes não escrevem mais `members` (nem score/status). O único
  caminho de escrita de avaliação é a função (Admin SDK, que bypassa rules).
- **Trilha de auditoria** continua append-only, agora escrita pela função com
  ator derivado do token de autenticação (não mais do cliente).
- **CSP atualizado**: `connect-src` agora inclui `https://*.cloudfunctions.net`
  (sem isso o navegador bloquearia a callable).

**Novo requisito operacional (importante):** o app passa a **depender das
functions deployadas** para salvar avaliações. Ordem de deploy:
`firebase deploy --only functions` **antes ou junto** com
`firebase deploy --only firestore:<database>` e hosting. Se as rules forem
publicadas sem as functions, salvar avaliação falha até o deploy das functions.

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
| Alta | Publicar **functions antes das rules** (o save depende da callable) | 1) `firebase deploy --only functions` (com `functions/.env`: `BOOTSTRAP_ADMIN_EMAIL`, opcional `TEAMS_WEBHOOK_URL`); 2) `firebase deploy --only firestore:ai-studio-gentedigital-cb816dee-4739-4dd8-8612-2cfe4702cf93`; 3) `firebase deploy --only hosting` e validar CSP |
| Alta | Publicar Hosting (`dist/` já buildado) e validar CSP | `firebase deploy --only hosting`; testar avatares, fontes, gráficos |
| Média | Habilitar deploy no CI | Variável `ENABLE_DEPLOY=true` + secret `FIREBASE_SERVICE_ACCOUNT` no GitHub |
| Média | Backup diário do Firestore | Cloud Scheduler → export para GCS |
| Média | MFA obrigatório para contas com role | Console Firebase Auth |
| Média | App Check nas escritas | Firebase Console → App Check → reCAPTCHA v3 |
| Média | P-01: visão do colaborador (`linkedUid` + rule de self-read, **sem usar e-mail como chave** — UID não muda) | Decisão de produto; revisão de segurança da regra |
| Baixa | Teste do PWA em iPhone real (ícones PNG + apple-touch-icon) | Gerar PNGs 192/512/180 e atualizar manifest/index.html |

## 9. O que foi CORRIGIDO e validado nesta rodada (rev. 3)

- **Callable `saveEvaluation`** (functions/src/index.ts + evaluationSchemas.ts):
  validação zod elemento a elemento no servidor (pdiGoals, history,
  criteriaScores completos 0..5, consistência score↔status, revisão otimista),
  grava avaliação + membro + auditLog em transação; ator do auditLog vem do
  token de autenticação.
- **Rules endurecidas e simplificadas** (35 testes no emulador): membros
  escritos só por admin; evaluations/auditLogs escritos só via função; leitura
  de evaluations por líder/admin; auditLogs só admin.
- **Cliente** chama a callable (`httpsCallable`); conflito de revisão mapeado
  para `EvaluationConflictError` (recarrega a avaliação como antes); erros
  tipados preservados.
- **CSP**: `connect-src` agora permite `https://*.cloudfunctions.net`.
- **13 novos testes de functions** para a callable (auth/roles, validação por
  elemento, conflito, membro ausente, gravações corretas) — total 39.

Validação executada (rev. 3): `npm run lint` OK (raiz e functions); `npm test`
21/21 (raiz) e 39/39 (functions); `npm run build` OK; `npm run test:rules`
35/35 no emulador.

## 10. Riscos aceitos conscientemente

- O fluxo de save depende de functions deployadas (aceito: é o preço da
  validação autoritativa no servidor; mitigado pela ordem de deploy
  documentada e pelo CI que publica tudo junto quando habilitado).
- Sobreposição de leader/admin ver todas as PII (equipe pequena e de confiança).
- Falta de staging (porte do projeto; CI cobre regressão).
- Dependências moderadas do `functions` (fail no CI apenas para high/critical).