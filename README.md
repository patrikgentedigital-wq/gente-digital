# Gente Digital

Plataforma interna de ranking, análise de desempenho e avaliação de equipes.

## Stack

- React + Vite + TypeScript
- Supabase (Postgres, Auth e Realtime): regras de acesso por equipe (RLS) e funções SQL que gravam avaliações e perguntas
- Vercel para publicar (cada envio ao GitHub gera um deploy; a `main` é produção)
- Tailwind CSS, Recharts e Vitest

## Desenvolvimento local

Pré-requisitos: Node.js 20 ou superior.

```sh
npm ci
npm run dev
```

Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` (chaves públicas: quem protege os dados é a RLS do banco).

## Validação

```sh
npm run lint
npm test
npm run build
```

## Banco, segurança e publicação

- O esquema, as regras de acesso e as funções ficam em `supabase/migrations/`
  (aplicar em ordem). O teste de segurança, que simula admin, líder da equipe,
  líder de outra equipe, líder sem equipe e anônimo, está em
  `supabase/tests/security.sql`; ele termina em erro de propósito ("OK: ...")
  para não deixar dados.
- Quem pode o quê: o **admin** lê e edita tudo; o **líder** lê e avalia só a própria
  equipe e edita só as perguntas dela. Notas, totais e status são calculados no
  servidor (`save_evaluation_with_criteria`). O banco confere a versão do formulário enviada pela tela.
- Contas: crie o usuário em Authentication no painel do Supabase e depois uma linha
  em `profiles` (papel `admin` ou `leader` e a equipe).
- Seed inicial: `node scripts/build-seed.mjs` gera `supabase/seed/0001_seed.sql` a
  partir de `scripts/seed-data.json` (veja `scripts/seed-data.example.json`). Os
  dados reais ficam fora do git porque o repositório é público.
- Publicação: a Vercel publica a `main` em produção e as outras branches como
  preview. Os cabeçalhos de segurança estão em `vercel.json`.

Para publicar a correção de versionamento, valide o app e a migração `0013`
juntos em homologação. Em produção, aplique a migração antes de promover o
frontend. A versão anterior do app bloqueia gravações de avaliações a partir
da migração. Oriente quem estiver avaliando a salvar seu trabalho antes da
janela de publicação e recarregar o app após a promoção.

Antes de publicar a função `sucesso-tecnicos`, configure no Supabase
`N8N_SUCESSO_TECNICOS_URL` com o endereço HTTPS homologado do webhook na
instância atual. A função exige esse endereço e recusa redirecionamentos.

> A versão antiga em Firebase (Cloud Functions, regras do Firestore, scripts de contas)
> foi removida do código; o que ela documentava está em `docs/historico-firebase/` e
> o resto continua no histórico do git (por exemplo, `git show 5b6c34b:functions/src/index.ts`).

