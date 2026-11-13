-- Teste do log de troca de time, cargo e nome. Termina em erro de propósito ("OK: ...") para não deixar dados.
do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-0000000000e1';
  n integer;
begin
  insert into auth.users (id, email, aud, role) values (admin_id, 'adm-log@teste.local', 'authenticated', 'authenticated');
  insert into public.teams (id, name) values ('ta', 'Equipe A'), ('tb', 'Equipe B');
  insert into public.profiles (user_id, role, team_id) values (admin_id, 'admin', null);
  insert into public.members (id, name, job_title, team_id) values ('m1', 'Ana', 'Analista', 'ta');

  -- sem mudança relevante: nada no log
  update public.members set avatar_url = 'https://exemplo.test/a.png' where id = 'm1';
  select count(*) into n from public.audit_logs where member_id = 'm1';
  assert n = 0, 'avatar não deveria gerar log, veio ' || n;

  update public.members set team_id = 'tb' where id = 'm1';
  select count(*) into n from public.audit_logs where member_id = 'm1' and action = 'member_team_changed' and member_name like '%ta → tb%';
  assert n = 1, 'troca de time não foi registrada';

  update public.members set job_title = 'Gerente' where id = 'm1';
  select count(*) into n from public.audit_logs where member_id = 'm1' and action = 'member_job_changed' and member_name like '%Analista → Gerente%';
  assert n = 1, 'troca de cargo não foi registrada';

  -- a função do gatilho não é chamável por quem está logado
  set local role authenticated;
  begin
    perform private.members_audit_changes();
    raise exception 'FALHOU: authenticated chamou a função do gatilho';
  exception when others then
    assert sqlerrm like '%permission denied%' or sqlerrm like '%does not exist%', 'esperava permission denied, veio: ' || sqlerrm;
  end;
  reset role;

  raise exception 'OK: log de troca de time e cargo';
end $$;
