-- Executar em banco de teste. A exceção final reverte todos os dados sintéticos.
do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-0000000000a1';
  leader_id uuid := '00000000-0000-0000-0000-0000000000b1';
  old_cats jsonb := '[{"id":"c1","name":"Geral","items":[{"id":"1-0","text":"Pergunta antiga"}]}]';
  new_cats jsonb := '[{"id":"c1","name":"Geral","items":[{"id":"1-0","text":"Pergunta nova"}]}]';
  r jsonb;
begin
  insert into auth.users (id,email,aud,role) values
    (admin_id,'admin@teste.local','authenticated','authenticated'),
    (leader_id,'lider@teste.local','authenticated','authenticated');
  insert into public.teams (id,name) values ('ta','Equipe A'),('tb','Equipe B');
  insert into public.profiles (user_id,role,team_id) values (admin_id,'admin',null),(leader_id,'leader','tb');
  insert into public.criteria_sets (team_id,version,categories,max_score) values ('ta',1,old_cats,5),('tb',1,new_cats,5);
  insert into public.members (id,name,job_title,team_id) values ('teste','Teste','Analista','ta');
  perform set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
  set local role authenticated;

  r := public.save_evaluation_with_criteria('teste','Novembro/2026','{"1-0":4}','','[]',0,'ta',1);
  assert (r->>'revision')::int = 1, 'nova avaliação deve ser criada';
  perform public.save_criteria_set('ta',new_cats);
  begin
    perform public.save_evaluation('teste','Dezembro/2026','{"1-0":4}','','[]',0);
    raise exception 'FALHOU: RPC antigo aceitou gravação sem versão';
  exception when others then
    assert sqlerrm like '%perguntas_desatualizadas%', 'RPC antigo deve recusar gravação ambígua: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation_with_criteria('teste','Dezembro/2026','{"1-0":4}','','[]',0,'ta',1);
    raise exception 'FALHOU: avaliação nova aceitou versão antiga';
  exception when others then
    assert sqlerrm like '%perguntas_desatualizadas%', 'nova avaliação deve exigir versão atual: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation_with_criteria('teste','Novembro/2026','{"1-0":4}','','[]',1,'ta',2);
    raise exception 'FALHOU: avaliação antiga aceitou versão nova';
  exception when others then
    assert sqlerrm like '%perguntas_desatualizadas%', 'edição deve exigir versão histórica: ' || sqlerrm;
  end;
  r := public.save_evaluation_with_criteria('teste','Novembro/2026','{"1-0":3}','','[]',1,'ta',1);
  assert (r->>'revision')::int = 2, 'edição com versão histórica deve funcionar';
  assert (select criteria_version from public.evaluations where member_id='teste' and cycle='Novembro/2026') = 1, 'versão histórica alterada';
  begin
    perform public.save_evaluation_with_criteria('teste','Novembro/2026','{"1-0":3}','','[]',1,'ta',1);
    raise exception 'FALHOU: revisão desatualizada aceita';
  exception when others then
    assert sqlerrm like '%conflito_de_revisao%', 'deve recusar revisão desatualizada: ' || sqlerrm;
  end;
  perform public.save_evaluation_with_criteria('teste','Outubro/2026','{"1-0":2}','','[]',0,'ta',2);
  perform public.save_evaluation_with_criteria('teste','Outubro/2026','{"1-0":1}','','[]',1,'ta',2);
  assert (select previous_score from public.audit_logs where action='evaluation_saved' and member_id='teste' and cycle='Outubro/2026' and revision=2) = 2, 'auditoria deve guardar nota anterior do ciclo';
  assert (select previous_status from public.audit_logs where action='evaluation_saved' and member_id='teste' and cycle='Outubro/2026' and revision=2) = 'Alarme', 'auditoria deve guardar status anterior do ciclo';
  assert (select previous_score from public.audit_logs where action='evaluation_saved' and member_id='teste' and cycle='Outubro/2026' and revision=1) is null, 'primeira avaliação não tem nota anterior';
  update public.members set team_id='tb' where id='teste';
  reset role;
  perform set_config('request.jwt.claims',json_build_object('sub',leader_id,'role','authenticated')::text,true);
  set local role authenticated;
  begin
    perform public.save_evaluation_with_criteria('teste','Novembro/2026','{"1-0":2}','','[]',2,'ta',1);
    raise exception 'FALHOU: líder acessou avaliação histórica de outra equipe';
  exception when others then
    assert sqlerrm like '%avaliacao_historica_sem_acesso%', 'deve informar histórico sem acesso: ' || sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
  set local role authenticated;
  perform public.save_evaluation_with_criteria('teste','Novembro/2026','{"1-0":2}','','[]',2,'ta',1);
  assert (select team_id from public.evaluations where member_id='teste' and cycle='Novembro/2026')='ta', 'equipe histórica alterada';
  reset role;
  raise exception 'OK: versão da avaliação preservada';
end $$;
