-- Teste da migração 0009: salvar um ciclo antigo não troca a nota atual do membro.
-- Termina em erro de propósito ("OK: ..."), então não sobra dado de teste.

do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-0000000000a1';
  cats jsonb := '[{"id":"c1","name":"Geral","items":[{"id":"1-0","text":"A"},{"id":"1-1","text":"B"}]}]';
  r jsonb;
  msg text;
begin
  insert into auth.users (id, email, aud, role) values (admin_id, 'admin@teste.local', 'authenticated', 'authenticated');
  insert into public.teams (id, name) values ('ta', 'Equipe A');
  insert into public.profiles (user_id, role, team_id) values (admin_id, 'admin', null);
  insert into public.criteria_sets (team_id, version, categories, max_score) values ('ta', 1, cats, 10);
  insert into public.members (id, name, job_title, team_id) values ('bia', 'Bia', 'Analista', 'ta');

  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;

  r := public.save_evaluation('bia', 'Novembro/2026', '{"1-0":5,"1-1":5}', '', '[]', 0);
  assert (r ->> 'is_current')::boolean, 'primeiro ciclo salvo deveria ser o atual';
  assert (select score from public.members where id = 'bia') = 10, 'nota atual deveria ser 10';

  -- Corrige outubro depois de novembro: a nota atual (novembro) não pode mudar
  r := public.save_evaluation('bia', 'Outubro/2026', '{"1-0":1,"1-1":1}', '', '[]', 0);
  assert not (r ->> 'is_current')::boolean, 'outubro não deveria ser o ciclo atual';
  assert (select score from public.members where id = 'bia') = 10, 'FALHOU: ciclo antigo trocou a nota atual';
  assert (select status from public.members where id = 'bia') = 'Voando', 'FALHOU: ciclo antigo trocou o status atual';
  assert (select count(*) from public.evaluations where member_id = 'bia') = 2, 'as duas avaliações deveriam existir';
  assert jsonb_array_length((select history from public.members where id = 'bia')) = 2, 'histórico deveria ter os dois ciclos';

  -- Um ciclo mais novo volta a atualizar o membro
  r := public.save_evaluation('bia', 'Dezembro/2026', '{"1-0":2,"1-1":2}', '', '[]', 0);
  assert (r ->> 'is_current')::boolean, 'dezembro deveria ser o atual';
  assert (select score from public.members where id = 'bia') = 4, 'nota atual deveria ir para 4';

  -- Regravar o próprio ciclo atual continua atualizando
  r := public.save_evaluation('bia', 'Dezembro/2026', '{"1-0":3,"1-1":3}', '', '[]', 1);
  assert (select score from public.members where id = 'bia') = 6, 'regravar o ciclo atual deveria atualizar';

  -- Formato de ciclo fora do padrão do app continua atualizando (comportamento anterior)
  r := public.save_evaluation('bia', 'Ciclo especial', '{"1-0":5,"1-1":4}', '', '[]', 0);
  assert (select score from public.members where id = 'bia') = 9, 'ciclo fora do padrão deveria atualizar como antes';
  reset role;

  raise exception 'OK: ciclo antigo não muda a nota atual';
exception when others then
  get stacked diagnostics msg = message_text;
  if msg like 'OK:%' then raise notice '%', msg; raise; else raise; end if;
end $$;
