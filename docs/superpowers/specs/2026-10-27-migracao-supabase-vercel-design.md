# Migração do Quadro de Desempenho para Supabase e Vercel, com perguntas por equipe

Data: 2026-10-27. Autor: Claude. Aprovação pendente: Patrik.

## Objetivo
1. Cada equipe tem as suas próprias perguntas de avaliação, editáveis por uma aba no app.
   O admin edita as de qualquer equipe; cada líder edita só as da própria equipe.
2. As avaliações e as perguntas passam a ser gravadas com validação no servidor, sem
   Cloud Functions e sem faturamento do Firebase.
3. Banco e login vão para o Supabase; a hospedagem vai para a Vercel, com publicação
   automática a cada envio ao GitHub.

Sucesso: um líder entra, vê só a própria equipe, edita as perguntas dela, avalia um
membro com essas perguntas, e o ranking mostra o resultado, tudo no endereço da Vercel.

## Situação de partida (verificada em 2026-10-27)
- Firestore: 29 membros ativos e 1 arquivado, 9 equipes antigas em `teams`, 9 conjuntos
  iguais de 31 perguntas em `criteriaSets`. Nenhuma avaliação e nenhum log de auditoria
  salvos. Mariza Leite, Danielle e João Lucas existem só no campo `team` dos membros.
- Nenhuma Cloud Function publicada e faturamento do Firebase desligado: o botão Avaliar
  chama `saveEvaluation`, que não existe no ar.
- A camada de dados fica em `src/lib/firebaseLoader.ts` (cerca de 14 funções): login e
  papel, membros (listar em tempo real, criar, editar, arquivar, restaurar, arquivados),
  avaliação (ler, salvar com conflito de revisão) e auditoria.

## Arquitetura
- Frontend: o mesmo app React/Vite. Um módulo `src/lib/backend/` com as mesmas funções
  do `firebaseLoader`, implementado com `@supabase/supabase-js`. As telas mudam pouco.
- Banco e login: um projeto Supabase novo, região `sa-east-1`, com Postgres, Auth por
  e-mail e senha, Realtime e funções SQL. O Firebase continua no ar até a paridade.
- Hospedagem: projeto novo na Vercel (nome `quadro-desempenho`), ligado ao GitHub.
  `main` é produção; cada branch ganha um endereço de teste. Variáveis públicas:
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A chave de serviço nunca vai ao navegador.

## Modelo de dados (Postgres)
- `teams(id text pk, name, color, active)`.
- `profiles(user_id uuid pk -> auth.users, role in ('admin','leader'), team_id -> teams null, name)`.
  O papel e a equipe do líder vêm daqui, não de claims do token.
- `members(id text pk, name, job_title, team_id -> teams, avatar_url, email, evaluation_status,
  score, max_score, status, current_rating, history jsonb, pdi_goals jsonb, deleted_at, deleted_by)`.
  `score`, `max_score` e `status` só mudam pela função `save_evaluation`.
- `criteria_sets(team_id, version int, categories jsonb, created_by, created_at, pk(team_id, version))`.
  Só se insere: editar as perguntas cria uma versão nova. A vigente é a de maior versão.
  `categories` = lista de `{id, name, items: [{id, text}]}`; o máximo da equipe é itens x 5.
- `evaluations(id, member_id, cycle, team_id, criteria_version, scores jsonb, score, max_score,
  status, comments, leader_id, pdi_goals jsonb, revision, created_at, updated_at, unique(member_id, cycle))`.
  Guarda a versão das perguntas usada, para o histórico continuar legível depois de edições.
- `audit_logs` só de inserção (gatilho bloqueia update e delete).
- Visão `members_ranked`: ordena por percentual (`score / max_score`) e depois por nome.

## Segurança
- RLS ligada em todas as tabelas. Admin lê e escreve tudo. Líder lê membros, avaliações e
  perguntas só da própria equipe; escreve só pelas funções abaixo.
- `save_evaluation(member_id, cycle, scores, comments, pdi_goals, expected_revision)`:
  confere que o chamador é admin ou líder da equipe do membro, que cada nota está entre 0 e 5
  e cobre exatamente as perguntas da versão vigente, calcula pontos, máximo e status no
  servidor, aplica trava otimista pela revisão e grava a auditoria. Tudo numa transação.
- `save_criteria_set(team_id, categories)`: admin em qualquer equipe, líder só na própria.
  Valida a forma (até 10 categorias, 15 itens por categoria, texto de 1 a 200 caracteres,
  ids estáveis) e insere a versão nova.
- Arquivar e restaurar membro: só admin, por função.

## Pontuação e ranking (decisão que precisa da sua aprovação)
Equipes com números de perguntas diferentes têm totais diferentes. O status passa a usar
o percentual do máximo da equipe, mantendo as faixas atuais (155 pontos): Voando acima de
90,3%, Caminho Certo acima de 83,9%, Atenção a partir de 77,4%, Alarme abaixo disso.
O ranking ordena por percentual e mostra também os pontos (por exemplo "132 / 155 (85%)").

## Telas
- Aba nova **Perguntas** (admin e líder). Admin escolhe a equipe; líder só vê a dela.
  Permite adicionar, renomear, reordenar e remover categorias e perguntas, mostra o total
  máximo em tempo real e avisa que avaliações já feitas mantêm as perguntas antigas.
- **Avaliar** passa a ler as perguntas da equipe do membro (no lugar de `CRITERIA_CATEGORIES`).
- Demais telas: troca da camada de dados, sem mudança de comportamento.

## Migração de dados
- Script único lê o Firestore e grava no Supabase: equipes (as 6 em uso mais as 6 antigas
  sem membros, marcadas inativas), 30 membros (o arquivado continua arquivado), e as
  perguntas padrão de 31 itens copiadas como versão 1 para cada equipe em uso.
- Contas: cada líder e o admin são recriados no Supabase Auth com convite por e-mail para
  definir senha. Primeiro admin criado por SQL. Preciso da lista de e-mails e equipes.

## Fases (cada uma termina testada e commitada, sem publicar)
1. Projeto Supabase, esquema, RLS, funções e testes SQL de segurança.
2. Módulo `backend` Supabase e troca no app; login, membros e ranking funcionando.
3. Avaliar com perguntas da equipe e `save_evaluation`.
4. Aba Perguntas.
5. Script de migração dos dados e contas.
6. Projeto Vercel e endereço de teste. Você valida com a sua conta.
7. Virada: `main` na Vercel; o endereço do Firebase vira um aviso com o novo link.

## Testes
- Unitários: percentual, status, ranking e validação de perguntas.
- SQL: com papéis admin, líder da equipe, líder de outra equipe e anônimo, cada tabela e
  função aceita só o que deve, e rejeita o resto.
- Fim a fim: login, avaliar um membro, editar perguntas, ver o ranking.

## Fora do escopo
Integração com IXC, redesenho de relatórios, notificações e recriar o que a versão antiga
tinha e este código não tem (filtros de status, exportar CSV, organograma). Podem virar
tarefas depois.

## Riscos
- Plano gratuito do Supabase: máximo de 2 projetos e pausa após uma semana sem uso. Hoje há
  2 projetos, um já pausado. Pode exigir o plano Pro ou liberar um projeto.
- Plano gratuito da Vercel é de uso pessoal sem fins comerciais; para uso da empresa, o
  correto é o Pro. Não foi possível ver o plano atual da conta.
- Erro em política RLS expõe dados: por isso os testes SQL entram antes de qualquer tela.
- Até a virada o salvamento de avaliações no site atual continua sem funcionar.

## Decisões que preciso de você
1. Aprova o ranking e o status por percentual?
2. Qual projeto Supabase usar (novo, exige plano ou liberar vaga)?
3. Qual plano da Vercel e o nome `quadro-desempenho` está bom?
4. Lista de e-mails e equipe de cada líder e do admin.
5. As perguntas iniciais das equipes novas podem ser as 31 padrão?
