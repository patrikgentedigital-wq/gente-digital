-- Teste das perguntas por membro (migração 0007). Roda numa transação que termina em erro de propósito ("OK: ..."),
-- então não sobra dado de teste.

do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-0000000000a1';
  leader_a uuid := '00000000-0000-0000-0000-0000000000b1';
  cats_team jsonb := '[{"id":"c1","name":"Geral","items":[{"id":"1-0","text":"A"},{"id":"1-1","text":"B"}]}]';
  cats_own  jsonb := '[{"id":"c1","name":"Própria","items":[{"id":"9-0","text":"Z"}]}]';
  r jsonb;
  n integer;
  msg text;
begin
  insert into auth.users (id, email, aud, role) values
    (admin_id, 'admin@teste.local', 'authenticated', 'authenticated'),
    (leader_a, 'a@teste.local', 'authenticated', 'authenticated');
  insert into public.teams (id, name) values ('ta', 'Equipe A'), ('ta-ana', 'Equipe A - Ana');
  insert into public.profiles (user_id, role, team_id) values (admin_id, 'admin', null), (leader_a, 'leader', 'ta');
  insert into public.criteria_sets (team_id, version, categories, max_score) values
    ('ta', 1, cats_team, 10), ('ta-ana', 1, cats_own, 5);
  insert into public.members (id, name, job_title, team_id) values ('bia', 'Bia', 'Analista', 'ta');
  insert into public.members (id, name, job_title, team_id, criteria_set_id) values ('ana', 'Ana', 'Gerente', 'ta', 'ta-ana');

  assert (select max_score from public.members where id = 'bia') = 10, 'Bia deveria usar o máximo da equipe (10)';
  assert (select max_score from public.members where id = 'ana') = 5, 'Ana deveria usar o máximo do conjunto próprio (5)';
  assert (select criteria_team_id from public.members_ranked where id = 'ana') = 'ta-ana', 'view deveria expor o conjunto da Ana';
  assert (select criteria_team_id from public.members_ranked where id = 'bia') = 'ta', 'view deveria expor a equipe da Bia';

  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Ana é avaliada com as perguntas dela; as da equipe não servem
  begin
    perform public.save_evaluation('ana', 'c', '{"1-0":5,"1-1":4}', '', '[]', 0);
    raise exception 'FALHOU: aceitou perguntas da equipe para a Ana';
  exception when others then
    assert sqlerrm like '%perguntas_desatualizadas%', 'esperava perguntas_desatualizadas, veio: ' || sqlerrm;
  end;
  r := public.save_evaluation('ana', 'c', '{"9-0":5}', '', '[]', 0);
  assert (r ->> 'max_score')::int = 5, 'máximo da avaliação da Ana deveria ser 5';
  assert (select criteria_team_id from public.evaluations where member_id = 'ana') = 'ta-ana', 'avaliação deveria apontar para o conjunto da Ana';
  assert (select team_id from public.evaluations where member_id = 'ana') = 'ta', 'avaliação continua na equipe A';

  -- Bia segue com as perguntas da equipe
  r := public.save_evaluation('bia', 'c', '{"1-0":5,"1-1":4}', '', '[]', 0);
  assert (r ->> 'max_score')::int = 10, 'máximo da Bia deveria ser 10';
  reset role;

  -- Líder da equipe A avalia a Ana normalmente (o acesso é pela equipe do membro)
  perform set_config('request.jwt.claims', json_build_object('sub', leader_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.save_evaluation('ana', 'c2', '{"9-0":3}', '', '[]', 0);
  assert (r ->> 'score')::int = 3, 'líder da equipe deveria conseguir avaliar a Ana';
  reset role;

  -- Editar o conjunto da Ana não mexe na Bia
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.save_criteria_set('ta-ana', '[{"id":"c1","name":"Própria","items":[{"id":"9-0","text":"Z"},{"id":"9-1","text":"Y"}]}]');
  assert (r ->> 'version')::int = 2 and (r ->> 'max_score')::int = 10, 'conjunto da Ana deveria ir à versão 2 com 10 pontos';
  reset role;
  assert (select max_score from public.members where id = 'bia') = 10, 'Bia não deveria mudar';

  raise exception 'OK: perguntas por membro';
exception when others then
  get stacked diagnostics msg = message_text;
  if msg like 'OK:%' then raise notice '%', msg; raise; else raise; end if;
end $$;
