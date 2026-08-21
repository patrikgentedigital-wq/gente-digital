# Gente Digital

Plataforma interna de ranking, análise de desempenho e avaliação de equipes.

## Stack

- React + Vite + TypeScript
- Firebase Authentication e Firestore
- Cloud Functions para provisionamento de roles e gravação autoritativa de avaliações
- Tailwind CSS, Recharts e Vitest

## Desenvolvimento local

Pré-requisitos: Node.js 20 ou superior.

```sh
npm ci
npm run dev
```

O projeto usa a configuração pública do Firebase em
`firebase-applet-config.json`. Para sobrescrever valores localmente, copie
`.env.example` para `.env.local`.

Para habilitar o App Check no frontend, informe `VITE_FIREBASE_APPCHECK_SITE_KEY`
com a site key reCAPTCHA v3 cadastrada no Firebase Console. Depois, ative a
exigência de App Check no Firebase apenas após validar o domínio publicado.

## Validação

```sh
npm run lint
npm test
npm run build

cd functions
npm ci
npm run lint
npm test
npm run build
```

Para publicar o app, as Cloud Functions precisam ser publicadas junto com as
Rules porque o salvamento de avaliações usa a callable `saveEvaluation`:

```sh
firebase deploy --only functions,firestore,hosting
```

Os hooks de deploy executam os builds do frontend e de `functions/` antes da
publicação. O Firestore aceita membros legados sem o campo `deleted`; eles são
tratados como ativos até serem arquivados.

## Roles e autorização

O acesso aos dados depende de e-mail verificado e custom claim `role`:

- `leader`: leitura e avaliações;
- `admin`: gerenciamento completo de colaboradores, avaliações e líderes.

### Gerenciamento de Usuários e Roles

Para listar, criar contas ou alterar permissões via terminal:

```sh
# Listar usuários cadastrados e suas roles
npm run roles -- list

# Criar um novo usuário líder ou admin (com e-mail verificado automaticamente)
npm run roles -- create-user lider@gentedigital.com.br SenhaForte123 leader

# Atribuir ou alterar role de um usuário existente
npm run roles -- set-role lider@gentedigital.com.br admin
```

Para mais detalhes e procedimentos via Cloud Functions, consulte [`docs/firebase-roles-runbook.md`](docs/firebase-roles-runbook.md).

Para validar as Rules localmente, execute:

```sh
firebase emulators:start --only auth,firestore
```

As Rules do Firestore continuam sendo a autoridade de segurança; a interface adapta os botões e formulários dinamicamente conforme o papel (`admin` ou `leader`) autenticado.
