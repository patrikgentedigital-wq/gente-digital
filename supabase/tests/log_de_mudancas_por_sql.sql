-- Teste do log de colaborador criado, equipes, perguntas e perfis. Termina em erro de propósito ("OK: ...") para não deixar dados.
do $$
declare
  uid uuid := '00000000-0000-0000-0000-0000000000f1';
  n integer;
begin
  insert into auth.users (id, email, aud, role) values (uid, 'adm-sql@teste.local', 'authenticated', 'authenticated');

  insert into public.teams (id, name) values ('ta', 'Equipe A');
  select count(*) into n from public.audit_logs where action = 'team_created' and member_name = 'ta';
  assert n = 1, 'equipe criada não foi registrada';

  update public.teams set color = '#112233', active = false where id = 'ta';
  select count(*) into n from public.audit_logs where action = 'team_changed' and member_name like 'ta · %';
  assert n = 2, 'cor e ativação deveriam gerar 2 registros, vieram ' || n;

  insert into public.members (id, name, job_title, team_id) values ('m1', 'Ana', 'Analista', 'ta');
  select count(*) into n from public.audit_logs where action = 'member_created' and member_id = 'm1';
  assert n = 1, 'colaborador criado não foi registrado';

  insert into public.criteria_sets (team_id, version, categories, max_score) values ('ta', 1, '[]', 10);
  select count(*) into n from public.audit_logs where action = 'criteria_saved' and member_name like 'ta · versão 1%';
  assert n = 1, 'perguntas por SQL não foram registradas';

  insert into public.profiles (user_id, role, team_id, name) values (uid, 'leader', 'ta', 'Líder Teste');
  select count(*) into n from public.audit_logs where action = 'profile_created' and member_name like 'Líder Teste%';
  assert n = 1, 'perfil criado por SQL não foi registrado';

  update public.profiles set role = 'admin', team_id = null where user_id = uid;
  select count(*) into n from public.audit_logs where action = 'profile_changed';
  assert n = 1, 'perfil alterado por SQL não foi registrado';

  -- com token de API (como a edge function), o gatilho não duplica o log que a função já grava
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update public.profiles set role = 'leader', team_id = 'ta' where user_id = uid;
  select count(*) into n from public.audit_logs where action = 'profile_changed';
  assert n = 1, 'com token não deveria registrar de novo, veio ' || n;

  -- as funções dos gatilhos não são chamáveis por quem está logado
  set local role authenticated;
  begin
    perform private.is_direct_sql();
    raise exception 'FALHOU: authenticated chamou is_direct_sql';
  exception when others then
    assert sqlerrm like '%permission denied%' or sqlerrm like '%does not exist%', 'esperava permission denied, veio: ' || sqlerrm;
  end;
  reset role;

  raise exception 'OK: log de mudanças por SQL';
end $$;
