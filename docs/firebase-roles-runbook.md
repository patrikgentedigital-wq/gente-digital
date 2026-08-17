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

## 2. Bootstrap do primeiro admin

1. Crie o usuário no console Firebase (Authentication > Add user) com o
   e-mail configurado em `BOOTSTRAP_ADMIN_EMAIL`.
2. Verifique o e-mail do usuário (link enviado por e-mail, ou no console
   use a opção de reenviar/verificar).
3. Rode na máquina com as credenciais do próprio usuário:

```sh
npm run provision -- bootstrap lider@gentedigital.com.br <senha>
```

Saída esperada: `Admin provisionado: lider@gentedigital.com.br (role=admin)`.

Se falhar: confirme que o e-mail está verificado, que o parâmetro
`BOOTSTRAP_ADMIN_EMAIL` está publicado e que ainda não existe outro admin.

## 3. Operações do dia a dia

Com o primeiro admin autenticado:

```sh
# Promover líder
npm run provision -- set-role admin@x.com <senhaAdmin> leader fernanda@gentedigital.com.br

# Promover admin
npm run provision -- set-role admin@x.com <senhaAdmin> admin alexandre@gentedigital.com.br

# Remover papel (desligar acesso)
npm run provision -- set-role admin@x.com <senhaAdmin> null diego@gentedigital.com.br
```

O usuário promovido precisa reautenticar (ou `getIdToken(true)`) para o token
refletir o novo claim. O login existente no app só carrega o claim após novo
login — se a sessão ficar pendurada, faça logout/login.

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
