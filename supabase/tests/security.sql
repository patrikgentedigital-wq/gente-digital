-- Testes de segurança. Rodar com execute_sql (ou psql) no projeto de desenvolvimento.
-- Tudo acontece numa transação que termina em erro de propósito ("OK: ..."), então não sobra dado de teste.
-- Qualquer falha aparece como "esperava ..." ou "assertion failed" com o motivo.

do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-0000000000a1';
  leader_a uuid := '00000000-0000-0000-0000-0000000000b1';
  leader_b uuid := '00000000-0000-0000-0000-0000000000b2';
  leader_x uuid := '00000000-0000-0000-0000-0000000000b3';  -- líder sem equipe
  cats_a jsonb := '[{"id":"c1","name":"Comunicação","items":[{"id":"1-0","text":"A"},{"id":"1-1","text":"B"}]},
                    {"id":"c2","name":"Qualidade","items":[{"id":"2-0","text":"C"}]}]';
  cats_a2 jsonb := '[{"id":"c1","name":"Comunicação","items":[{"id":"1-0","text":"A"},{"id":"1-1","text":"B"},{"id":"1-2","text":"B2"}]},
                     {"id":"c2","name":"Qualidade","items":[{"id":"2-0","text":"C"}]}]';
  cats_b jsonb := '[{"id":"c1","name":"Geral","items":[{"id":"9-0","text":"Z"}]}]';
  good_scores jsonb := '{"1-0":5,"1-1":4,"2-0":3}';
  n integer;
  r jsonb;
  msg text;
begin
  -- Fixtures (como dono do banco, sem RLS)
  insert into auth.users (id, email, aud, role) values
    (admin_id, 'admin@teste.local', 'authenticated', 'authenticated'),
    (leader_a, 'a@teste.local', 'authenticated', 'authenticated'),
    (leader_b, 'b@teste.local', 'authenticated', 'authenticated'),
    (leader_x, 'x@teste.local', 'authenticated', 'authenticated');
  insert into public.teams (id, name) values ('ta', 'Equipe A'), ('tb', 'Equipe B');
  insert into public.profiles (user_id, role, team_id) values
    (admin_id, 'admin', null), (leader_a, 'leader', 'ta'), (leader_b, 'leader', 'tb'), (leader_x, 'leader', null);
  insert into public.criteria_sets (team_id, version, categories, max_score) values
    ('ta', 1, cats_a, 15), ('tb', 1, cats_b, 5);
  insert into public.members (id, name, job_title, team_id) values
    ('ma', 'Ana', 'Analista', 'ta'), ('mb', 'Bia', 'Analista', 'tb'), ('marc', 'Arquivada', 'Analista', 'ta');
  update public.members set deleted_at = now() where id = 'marc';
  assert (select max_score from public.members where id = 'ma') = 15, 'trigger deveria copiar o máximo da equipe (15)';

  -- (a) anônimo não lê nem chama nada
  set local role anon;
  begin
    perform count(*) from public.members;
    raise exception 'FALHOU: anônimo leu members';
  exception when others then
    assert sqlerrm like '%permission denied%', 'esperava permission denied para anon, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation('ma', 'c', good_scores, '', '[]', 0);
    raise exception 'FALHOU: anônimo chamou save_evaluation';
  exception when others then
    assert sqlerrm like '%permission denied%', 'esperava permission denied para anon na função, veio: ' || sqlerrm;
  end;
  reset role;

  -- (b) admin lê tudo
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.members;
  assert n = 3, 'admin deveria ver 3 membros, viu ' || n;
  select count(*) into n from public.members_ranked;
  assert n = 2, 'ranking não deveria incluir arquivado, mostrou ' || n;
  reset role;

  -- (c) líder da equipe A vê só a A
  perform set_config('request.jwt.claims', json_build_object('sub', leader_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.members;
  assert n = 2, 'líder A deveria ver 2 membros (ma e marc), viu ' || n;
  select count(*) into n from public.members where id = 'mb';
  assert n = 0, 'líder A não pode ver membro da equipe B';
  select count(*) into n from public.teams;
  assert n = 1, 'líder A deveria ver só a própria equipe';
  select count(*) into n from public.criteria_sets where team_id = 'tb';
  assert n = 0, 'líder A não pode ver perguntas da equipe B';
  select count(*) into n from public.audit_logs;
  assert n = 0, 'líder não lê auditoria';
  reset role;

  -- (d) líder sem equipe não lê nada e não grava nada
  perform set_config('request.jwt.claims', json_build_object('sub', leader_x, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.members;
  assert n = 0, 'líder sem equipe não deveria ver membros, viu ' || n;
  select count(*) into n from public.members_ranked;
  assert n = 0, 'líder sem equipe não deveria ver ranking';
  begin
    perform public.save_criteria_set('ta', cats_a);
    raise exception 'FALHOU: líder sem equipe editou perguntas';
  exception when others then
    assert sqlerrm like '%sem_permissao%', 'esperava sem_permissao, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation('ma', 'c', good_scores, '', '[]', 0);
    raise exception 'FALHOU: líder sem equipe avaliou';
  exception when others then
    assert sqlerrm like '%sem_permissao%', 'esperava sem_permissao, veio: ' || sqlerrm;
  end;
  reset role;

  -- (f) ninguém grava pontuação direto; admin edita só os campos permitidos
  perform set_config('request.jwt.claims', json_build_object('sub', leader_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.members set score = 100 where id = 'ma';
    raise exception 'FALHOU: líder alterou score direto';
  exception when others then
    assert sqlerrm like '%permission denied%', 'esperava permission denied, veio: ' || sqlerrm;
  end;
  update public.members set name = 'Hack' where id = 'ma';
  get diagnostics n = row_count;
  assert n = 0, 'líder não deveria conseguir editar membro (nenhuma política de update)';
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.members set score = 100 where id = 'ma';
    raise exception 'FALHOU: admin alterou score direto';
  exception when others then
    assert sqlerrm like '%permission denied%', 'esperava permission denied para admin, veio: ' || sqlerrm;
  end;
  update public.members set name = 'Ana Maria' where id = 'ma';
  get diagnostics n = row_count;
  assert n = 1, 'admin deveria editar o nome';
  insert into public.members (id, name, job_title, team_id) values ('mn', 'Nova', 'Analista', 'ta');
  assert (select max_score from public.members where id = 'mn') = 15, 'membro novo deveria herdar o máximo 15';
  begin
    insert into public.members (id, name, job_title, team_id, score) values ('mx', 'X', 'Analista', 'ta', 99);
    raise exception 'FALHOU: admin inseriu com score';
  exception when others then
    assert sqlerrm like '%permission denied%', 'esperava permission denied no insert, veio: ' || sqlerrm;
  end;
  reset role;

  -- (g) save_evaluation: validações
  perform set_config('request.jwt.claims', json_build_object('sub', leader_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.save_evaluation('ma', 'Out', '{"1-0":6,"1-1":4,"2-0":3}', '', '[]', 0);
    raise exception 'FALHOU: nota 6 aceita';
  exception when others then
    assert sqlerrm like '%nota_invalida%', 'esperava nota_invalida, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation('ma', 'Out', '{"1-0":2.5,"1-1":4,"2-0":3}', '', '[]', 0);
    raise exception 'FALHOU: nota 2.5 aceita';
  exception when others then
    assert sqlerrm like '%nota_invalida%', 'esperava nota_invalida para 2.5, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation('ma', 'Out', '{"1-0":"5","1-1":4,"2-0":3}', '', '[]', 0);
    raise exception 'FALHOU: nota em texto aceita';
  exception when others then
    assert sqlerrm like '%nota_invalida%', 'esperava nota_invalida para texto, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation('ma', 'Out', '{"1-0":5,"1-1":4}', '', '[]', 0);
    raise exception 'FALHOU: nota faltando aceita';
  exception when others then
    assert sqlerrm like '%perguntas_desatualizadas%', 'esperava perguntas_desatualizadas, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation('ma', 'Out', '{"1-0":5,"1-1":4,"2-0":3,"9-9":1}', '', '[]', 0);
    raise exception 'FALHOU: nota extra aceita';
  exception when others then
    assert sqlerrm like '%perguntas_desatualizadas%', 'esperava perguntas_desatualizadas para chave extra, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation('mb', 'Out', good_scores, '', '[]', 0);
    raise exception 'FALHOU: líder A avaliou membro da B';
  exception when others then
    assert sqlerrm like '%sem_permissao%', 'esperava sem_permissao, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_evaluation('marc', 'Out', good_scores, '', '[]', 0);
    raise exception 'FALHOU: avaliou membro arquivado';
  exception when others then
    assert sqlerrm like '%membro_indisponivel%', 'esperava membro_indisponivel, veio: ' || sqlerrm;
  end;

  -- avaliação válida: 12 de 15 = 80% (>= 77,4%) é Atenção
  r := public.save_evaluation('ma', 'Out', good_scores, 'ok', '[]', 0);
  assert (r ->> 'revision')::int = 1 and (r ->> 'score')::int = 12 and (r ->> 'max_score')::int = 15
         and r ->> 'status' = 'Atenção', 'resultado inesperado: ' || r::text;

  -- (h) conflito de revisão
  begin
    perform public.save_evaluation('ma', 'Out', good_scores, 'ok', '[]', 0);
    raise exception 'FALHOU: revisão antiga aceita';
  exception when others then
    assert sqlerrm like '%conflito_de_revisao%', 'esperava conflito_de_revisao, veio: ' || sqlerrm;
  end;
  r := public.save_evaluation('ma', 'Out', '{"1-0":5,"1-1":5,"2-0":5}', 'melhor', '[]', 1);
  assert (r ->> 'revision')::int = 2 and r ->> 'status' = 'Voando', 'segunda revisão inesperada: ' || r::text;
  reset role;

  -- (e) perguntas: líder só edita a própria equipe e a forma é validada
  perform set_config('request.jwt.claims', json_build_object('sub', leader_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.save_criteria_set('tb', cats_b);
    raise exception 'FALHOU: líder A editou a equipe B';
  exception when others then
    assert sqlerrm like '%sem_permissao%', 'esperava sem_permissao, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_criteria_set('ta', '[]');
    raise exception 'FALHOU: conjunto vazio aceito';
  exception when others then
    assert sqlerrm like '%perguntas_invalidas%', 'esperava perguntas_invalidas, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_criteria_set('ta', (select jsonb_agg(jsonb_build_object('id', 'k' || g, 'name', 'C' || g,
      'items', jsonb_build_array(jsonb_build_object('id', 'i' || g, 'text', 'T')))) from generate_series(1, 11) g));
    raise exception 'FALHOU: 11 categorias aceitas';
  exception when others then
    assert sqlerrm like '%perguntas_invalidas%', 'esperava perguntas_invalidas para 11 categorias, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_criteria_set('ta', jsonb_build_array(jsonb_build_object('id', 'k', 'name', 'C',
      'items', (select jsonb_agg(jsonb_build_object('id', 'i' || g, 'text', 'T')) from generate_series(1, 16) g))));
    raise exception 'FALHOU: 16 itens aceitos';
  exception when others then
    assert sqlerrm like '%perguntas_invalidas%', 'esperava perguntas_invalidas para 16 itens, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_criteria_set('ta', '[{"id":"k","name":"C","items":[{"id":"i1","text":"  "}]}]');
    raise exception 'FALHOU: texto vazio aceito';
  exception when others then
    assert sqlerrm like '%perguntas_invalidas%', 'esperava perguntas_invalidas para texto vazio, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_criteria_set('ta', jsonb_build_array(jsonb_build_object('id', 'k', 'name', 'C',
      'items', jsonb_build_array(jsonb_build_object('id', 'i1', 'text', repeat('x', 201))))));
    raise exception 'FALHOU: texto de 201 caracteres aceito';
  exception when others then
    assert sqlerrm like '%perguntas_invalidas%', 'esperava perguntas_invalidas para 201 caracteres, veio: ' || sqlerrm;
  end;
  begin
    perform public.save_criteria_set('ta', '[{"id":"k","name":"C","items":[{"id":"i1","text":"A"},{"id":"i1","text":"B"}]}]');
    raise exception 'FALHOU: ids repetidos aceitos';
  exception when others then
    assert sqlerrm like '%perguntas_invalidas%', 'esperava perguntas_invalidas para ids repetidos, veio: ' || sqlerrm;
  end;
  r := public.save_criteria_set('ta', cats_a2);
  assert (r ->> 'version')::int = 2 and (r ->> 'max_score')::int = 20, 'versão 2 inesperada: ' || r::text;
  -- avaliação feita com as perguntas antigas agora é recusada
  begin
    perform public.save_evaluation('ma', 'Nov', good_scores, '', '[]', 0);
    raise exception 'FALHOU: perguntas antigas aceitas após edição';
  exception when others then
    assert sqlerrm like '%perguntas_desatualizadas%', 'esperava perguntas_desatualizadas, veio: ' || sqlerrm;
  end;
  reset role;

  -- máximo: quem já foi avaliado mantém 15; quem não foi passa a 20
  select max_score into n from public.members where id = 'ma';
  assert n = 15, 'membro avaliado deveria manter o máximo 15, ficou ' || n;
  select max_score into n from public.members where id = 'mn';
  assert n = 20, 'membro sem avaliação deveria passar a 20, ficou ' || n;
  -- a avaliação antiga continua apontando para a versão 1
  assert (select criteria_version from public.evaluations where member_id = 'ma' and cycle = 'Out') = 1,
    'avaliação antiga deveria manter a versão 1';

  -- admin edita qualquer equipe
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.save_criteria_set('tb', cats_b);
  assert (r ->> 'version')::int = 2, 'admin deveria criar a versão 2 da equipe B';

  -- arquivar e restaurar: só admin
  perform public.archive_member('ma');
  select count(*) into n from public.members_ranked where id = 'ma';
  assert n = 0, 'arquivado não deve aparecer no ranking';
  perform public.restore_member('ma');
  select count(*) into n from public.members_ranked where id = 'ma';
  assert n = 1, 'restaurado deve voltar ao ranking';
  select count(*) into n from public.audit_logs;
  assert n >= 4, 'auditoria deveria ter registros, tem ' || n;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', leader_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.archive_member('ma');
    raise exception 'FALHOU: líder arquivou membro';
  exception when others then
    assert sqlerrm like '%sem_permissao%', 'esperava sem_permissao ao arquivar, veio: ' || sqlerrm;
  end;
  reset role;

  -- (j) auditoria só de inserção
  begin
    update public.audit_logs set action = 'x';
    raise exception 'FALHOU: update em audit_logs aceito';
  exception when others then
    assert sqlerrm like '%só de inserção%', 'esperava bloqueio de update, veio: ' || sqlerrm;
  end;
  begin
    delete from public.audit_logs;
    raise exception 'FALHOU: delete em audit_logs aceito';
  exception when others then
    assert sqlerrm like '%só de inserção%', 'esperava bloqueio de delete, veio: ' || sqlerrm;
  end;

  raise exception 'OK: todos os testes de segurança passaram';
end;
$$;
