# Runbook: provisionamento de roles

As Rules exigem o custom claim `role` (`leader` ou `admin`) vindo do Auth.
Este runbook descreve como provisionar esses papéis com as Cloud Functions
deste repositório (`functions/`).

## Papéis

- `role=leader`: consulta e cria/atualiza avaliações. Ao salvar, atualiza no
  membro apenas os campos de avaliação (ver `docs/firebase-auth-roles.md`).
- `role=admin`: gerencia membros (CRUD completo) e exclui avaliações.
- Sem claim `role`: nenhum acesso (nem leitura) a `members`/`evaluations`.

## Requisitos de Permissão no Google Cloud (IAM)

Para executar o provisionamento direto (`npm run roles` via `gcloud auth print-access-token`), a conta Google autenticada no `gcloud` precisa ter pelo menos um dos seguintes papéis (roles) atribuídos no projeto GCP `gen-lang-client-0169317507`:

- `roles/firebaseauth.admin` (**Firebase Authentication Admin**) — Permissão recomendada e de menor privilégio para gerenciar usuários e custom claims;
- `roles/identitytoolkit.admin` (**Identity Platform Admin**) — Controle completo do Identity Platform;
- `roles/owner` ou `roles/editor` (**Project Owner / Editor**).

> ⚠️ Contas com apenas permissão de visualizador (`roles/viewer`) receberão erro `403 PERMISSION_DENIED` ao tentar alterar custom claims.


## 1. Deploy das funções

Pré-requisitos: `firebase-tools` instalado e logado (`firebase login`),
projeto selecionado (`.firebaserc` já aponta para `gen-lang-client-0169317507`).

```sh
# Funções leem parâmetros via .env em functions/. Crie o arquivo:
cat > functions/.env <<'EOF'
BOOTSTRAP_ADMIN_EMAIL=lider@gentedigital.com.br
# TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...  # opcional: alertas de queda de status
EOF

firebase deploy --only functions
```

As Rules do Firestore usam o banco nomeado do projeto. Para publicar somente
as Rules desse banco:

```sh
firebase deploy --only firestore:ai-studio-gentedigital-cb816dee-4739-4dd8-8612-2cfe4702cf93
```

`BOOTSTRAP_ADMIN_EMAIL` só é usado pelo `bootstrapFirstAdmin`. Depois que o
primeiro admin existir, a função se recusa a rodar; o parâmetro pode ser
removido do `.env`.

`TEAMS_WEBHOOK_URL` (opcional) alimenta o trigger `onMemberStatusChanged`, que
postia um cartão no Teams quando um colaborador piora de status (ex.: de
"Caminho Certo" para "Atenção"). Sem o parâmetro, o trigger apenas ignora e
registra em log.

## 2. Bootstrap do primeiro admin

1. Crie o usuário no console Firebase (Authentication > Add user) com o
   e-mail configurado em `BOOTSTRAP_ADMIN_EMAIL`.
2. Verifique o e-mail do usuário (link enviado por e-mail, ou no console
   use a opção de reenviar/verificar).
3. Rode na máquina com as credenciais do próprio usuário (a senha é pedida
   via prompt, sem aparecer no histórico do shell):

```sh
npm run provision -- bootstrap lider@gentedigital.com.br
```

Saída esperada: `Admin provisionado: lider@gentedigital.com.br (role=admin)`.

Se falhar: confirme que o e-mail está verificado, que o parâmetro
`BOOTSTRAP_ADMIN_EMAIL` está publicado e que ainda não existe outro admin.

## 3. Operações do dia a dia

Com o primeiro admin autenticado (a senha do admin é pedida via prompt):

```sh
# Promover líder
npm run provision -- set-role admin@x.com leader fernanda@gentedigital.com.br

# Promover admin
npm run provision -- set-role admin@x.com admin alexandre@gentedigital.com.br

# Remover papel (desligar acesso)
npm run provision -- set-role admin@x.com null diego@gentedigital.com.br
```

Proteções implementadas na função `setUserRole`:

- Um admin não consegue remover a própria role;
- Não é possível remover a role do último admin do projeto;
- A role só é atribuída a um e-mail já cadastrado no Auth.

O usuário promovido precisa reautenticar (ou `getIdToken(true)`) para o token
refletir o novo claim. O login existente no app só carrega o claim após novo
login — se a sessão ficar pendurada, faça logout/login.

## 3.1 Gerenciamento direto via `npm run roles`

Utilitário que usa `gcloud auth print-access-token` (IAM no projeto). As
contas criadas por aqui **não** têm o e-mail auto-verificado — a verificação
precisa ser feita pelo fluxo normal do Firebase Auth, pois as Rules exigem
`email_verified`.

```sh
# Listar usuários
npm run roles -- list

# Criar usuário (a role é OBRIGATÓRIA e deve ser uma das seguintes)
npm run roles -- create-user <email> <senha> admin
npm run roles -- create-user <email> <senha> leader

# Atribuir/remover role de um usuário existente
npm run roles -- set-role <email> admin
npm run roles -- set-role <email> null
```

## 4. Regras de teste rápido

Crie contas de teste e confira a matriz no emulador (ou produção):

| Ação | leader | admin | sem role |
|---|---|---|---|
| Ler members/evaluations | ok | ok | negado |
| Salvar avaliação (inclui update parcial do member) | ok | ok | negado |
| Editar nome/e-mail/avatar do member | negado | ok | negado |
| Criar/excluir member | negado | ok | negado |
| Excluir avaliação | negado | ok | negado |

## 5. Rollback

Remover o claim zera o acesso do usuário (as Rules bloqueiam leitura).
Nenhuma exclusão de dados é feita ao remover o papel.
