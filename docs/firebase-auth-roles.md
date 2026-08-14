# Provisionamento de roles do Firebase Auth

> Operação completa, com deploy, bootstrap e exemplos: ver
> [docs/firebase-roles-runbook.md](firebase-roles-runbook.md).

As Rules locais exigem um custom claim confiável:

- `role=leader`: pode consultar e criar/atualizar avaliações. Ao salvar uma
  avaliação, pode atualizar no membro apenas os campos de avaliação (`score`,
  `status`, `evaluationStatus`, `pdiGoals`, `history`, `updatedAt`) — os demais
  campos (PII, avatar, equipe) são restritos a admins nas Rules.
- `role=admin`: pode gerenciar membros e excluir avaliações.

Esses claims devem ser atribuídos pelo Firebase Admin SDK em um ambiente
administrativo protegido. O frontend não pode criar ou alterar o próprio role.

Exemplo conceitual no backend administrativo:

```ts
await getAuth().setCustomUserClaims(uid, { role: 'leader' });
```

Depois de alterar o claim, o usuário precisa renovar o ID token (novo login ou
`currentUser.getIdToken(true)`). A conta também precisa estar com e-mail
verificado.

Não publique as Rules antes de provisionar pelo menos um administrador e testar
login, leitura, avaliação, criação, atualização e exclusão no Emulator/staging.
