-- Testes de segurança do registro de erros. Termina em erro de propósito ("OK: ...") para não deixar dados.
do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-0000000000d1';
  leader_id uuid := '00000000-0000-0000-0000-0000000000d2';
  orphan_id uuid := '00000000-0000-0000-0000-0000000000d3';  -- conta sem perfil
  n integer;
begin
  insert into auth.users (id, email, aud, role) values
    (admin_id, 'adm-erros@teste.local', 'authenticated', 'authenticated'),
    (leader_id, 'lid-erros@teste.local', 'authenticated', 'authenticated'),
    (orphan_id, 'orf-erros@teste.local', 'authenticated', 'authenticated');
  insert into public.teams (id, name) values ('ta', 'Equipe A');
  insert into public.profiles (user_id, role, team_id) values (admin_id, 'admin', null), (leader_id, 'leader', 'ta');

  -- anônimo não chama a função
  set local role anon;
  begin
    perform public.report_client_error('window', 'x', null, null, null);
    raise exception 'FALHOU: anônimo reportou';
  exception when others then
    assert sqlerrm like '%permission denied%', 'esperava permission denied, veio: ' || sqlerrm;
  end;
  reset role;

  -- líder reporta; mensagem repetida no mesmo minuto e fonte inválida são ignoradas
  perform set_config('request.jwt.claims', json_build_object('sub', leader_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.report_client_error('window', 'Erro A', 'stack', 'https://x/y', 'ua');
  perform public.report_client_error('window', 'Erro A', 'stack', 'https://x/y', 'ua');
  perform public.report_client_error('inventada', 'Erro B', null, null, null);
  perform public.report_client_error('promise', repeat('m', 2000), repeat('s', 9000), repeat('u', 900), repeat('a', 900));
  select count(*) into n from public.client_errors;
  assert n = 0, 'líder não pode ler os erros, viu ' || n;
  begin
    update public.client_errors set resolved_at = now();
    get diagnostics n = row_count;
    assert n = 0, 'líder não deveria resolver erros';
  exception when others then
    assert sqlerrm like '%permission denied%', 'esperava negar ao líder, veio: ' || sqlerrm;
  end;
  reset role;

  -- limite de 20 por pessoa em 10 minutos
  perform set_config('request.jwt.claims', json_build_object('sub', leader_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  for i in 1..30 loop
    perform public.report_client_error('window', 'Erro em massa ' || i, null, null, null);
  end loop;
  reset role;
  select count(*) into n from public.client_errors where user_id = leader_id;
  assert n = 20, 'o limite deveria parar em 20, tem ' || n;
  assert (select max(char_length(message)) from public.client_errors) <= 1000, 'mensagem deveria ser cortada em 1000';
  assert (select max(char_length(stack)) from public.client_errors) <= 4000, 'pilha deveria ser cortada em 4000';
  assert not exists (select 1 from public.client_errors where message = 'Erro B'), 'fonte inválida deveria ser ignorada';

  -- conta sem perfil é ignorada
  perform set_config('request.jwt.claims', json_build_object('sub', orphan_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.report_client_error('window', 'Erro do órfão', null, null, null);
  reset role;
  assert not exists (select 1 from public.client_errors where user_id = orphan_id), 'conta sem perfil não deveria reportar';

  -- admin lê e marca como resolvido
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.client_errors;
  assert n = 20, 'admin deveria ver 20 erros, viu ' || n;
  update public.client_errors set resolved_at = now() where message = 'Erro A';
  get diagnostics n = row_count;
  assert n = 1, 'admin deveria resolver 1 erro';
  begin
    update public.client_errors set message = 'adulterado';
    raise exception 'FALHOU: admin alterou a mensagem';
  exception when others then
    assert sqlerrm like '%permission denied%', 'esperava negar a edição da mensagem, veio: ' || sqlerrm;
  end;
  reset role;

  raise exception 'OK: testes do registro de erros passaram';
end;
$$;
