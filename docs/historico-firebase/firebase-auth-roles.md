# Provisionamento de roles do Firebase Auth

> Operação completa, com deploy, bootstrap e exemplos: ver
> [docs/firebase-roles-runbook.md](firebase-roles-runbook.md).

As Rules locais exigem um custom claim confiável:

- `role=leader`: pode consultar dados e salvar avaliações pela callable
  `saveEvaluation`. A função valida todos os elementos, grava membro, avaliação
  e auditoria em uma transação, e controla a revisão otimista.
- `role=admin`: pode gerenciar membros, arquivar/restaurar colaboradores e
  salvar avaliações. Exclusões definitivas e exclusões de avaliações pelo
  cliente são bloqueadas pelas Rules.

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
login, leitura, avaliação, criação, atualização e arquivamento no
Emulator/staging. Publique as Functions antes das Rules, pois o frontend não
possui fallback de escrita direta para avaliações.
