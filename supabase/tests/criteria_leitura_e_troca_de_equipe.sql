-- Teste da migração 0008. Roda numa transação que termina em erro de propósito ("OK: ..."), então não sobra dado.
-- 1) Líder da equipe lê o conjunto próprio dos membros dela; líder de outra equipe não lê.
-- 2) Mover membro sem avaliação para outra equipe atualiza o máximo; com avaliação, não mexe.

do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-0000000000a1';
  leader_a uuid := '00000000-0000-0000-0000-0000000000b1';
  leader_b uuid := '00000000-0000-0000-0000-0000000000b2';
  cats_a   jsonb := '[{"id":"c1","name":"Geral","items":[{"id":"1-0","text":"A"},{"id":"1-1","text":"B"}]}]';
  cats_b   jsonb := '[{"id":"c1","name":"Geral","items":[{"id":"1-0","text":"A"},{"id":"1-1","text":"B"},{"id":"1-2","text":"C"}]}]';
  cats_own jsonb := '[{"id":"c1","name":"Própria","items":[{"id":"9-0","text":"Z"}]}]';
  n integer;
  msg text;
begin
  insert into auth.users (id, email, aud, role) values
    (admin_id, 'admin@teste.local', 'authenticated', 'authenticated'),
    (leader_a, 'a@teste.local', 'authenticated', 'authenticated'),
    (leader_b, 'b@teste.local', 'authenticated', 'authenticated');
  insert into public.teams (id, name) values ('ta', 'Equipe A'), ('tb', 'Equipe B'), ('ta-ana', 'Equipe A - Ana');
  insert into public.profiles (user_id, role, team_id) values
    (admin_id, 'admin', null), (leader_a, 'leader', 'ta'), (leader_b, 'leader', 'tb');
  insert into public.criteria_sets (team_id, version, categories, max_score) values
    ('ta', 1, cats_a, 10), ('tb', 1, cats_b, 15), ('ta-ana', 1, cats_own, 5);
  insert into public.members (id, name, job_title, team_id) values ('bia', 'Bia', 'Analista', 'ta');
  insert into public.members (id, name, job_title, team_id, criteria_set_id) values ('ana', 'Ana', 'Gerente', 'ta', 'ta-ana');

  -- 1) leitura
  perform set_config('request.jwt.claims', json_build_object('sub', leader_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.criteria_sets where team_id = 'ta-ana';
  assert n = 1, 'líder da equipe A deveria ler o conjunto da Ana (veio ' || n || ')';
  select count(*) into n from public.criteria_sets where team_id = 'tb';
  assert n = 0, 'líder da equipe A não deveria ler as perguntas da equipe B';
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', leader_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.criteria_sets where team_id = 'ta-ana';
  assert n = 0, 'líder da equipe B não deveria ler o conjunto da Ana';
  reset role;

  -- 2) mover membro
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.members set team_id = 'tb' where id = 'bia';
  reset role;
  assert (select max_score from public.members where id = 'bia') = 15, 'Bia sem avaliação deveria passar ao máximo da equipe B (15)';

  update public.members set team_id = 'tb' where id = 'ana';
  assert (select max_score from public.members where id = 'ana') = 5, 'Ana segue com o conjunto próprio (5)';

  set local role authenticated;
  perform public.save_evaluation('bia', 'c', '{"1-0":5,"1-1":4,"1-2":3}', '', '[]', 0);
  update public.members set team_id = 'ta' where id = 'bia';
  reset role;
  assert (select max_score from public.members where id = 'bia') = 15, 'Bia já avaliada não deveria mudar o máximo ao mudar de equipe';

  raise exception 'OK: leitura de perguntas e troca de equipe';
exception when others then
  get stacked diagnostics msg = message_text;
  if msg like 'OK:%' then raise notice '%', msg; raise; else raise; end if;
end $$;
