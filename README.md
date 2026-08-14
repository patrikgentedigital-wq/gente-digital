# Gente Digital

Plataforma interna de ranking, análise de desempenho e avaliação de equipes.

## Stack

- React + Vite + TypeScript
- Firebase Authentication e Firestore
- Cloud Functions para provisionamento de roles
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

## Roles e autorização

O acesso aos dados depende de e-mail verificado e custom claim `role`:

- `leader`: leitura e avaliações;
- `admin`: gerenciamento de colaboradores e avaliações.

O provisionamento é descrito em
[`docs/firebase-roles-runbook.md`](docs/firebase-roles-runbook.md).

Para validar as Rules localmente, instale o Firebase CLI e execute:

```sh
firebase emulators:start --only auth,firestore
```

As Rules continuam sendo a autoridade de segurança; a visibilidade dos botões
no frontend é apenas uma melhoria de experiência.
