-- Implantação: aplicar primeiro esta migração, depois publicar o cliente que chama
-- save_evaluation_with_criteria. Clientes antigos devem recarregar: sua RPC antiga
-- recusa gravações sem identificar a versão das perguntas.

create function public.save_evaluation_with_criteria(
  p_member_id text, p_cycle text, p_scores jsonb, p_comments text, p_pdi_goals jsonb,
  p_expected_revision integer, p_criteria_team_id text, p_criteria_version integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := private.my_role();
  m public.members%rowtype;
  v_existing public.evaluations%rowtype;
  v_has_existing boolean;
  v_lock_team text;
  v_crit public.criteria_sets%rowtype;
  v_expected text[];
  v_given text[];
  v_current integer;
  v_score integer := 0;
  v_status text;
  v_id text;
  v_entry record;
  v_rank integer;
  v_is_current boolean;
begin
  if v_role is null then raise exception 'sem_permissao' using errcode = '42501'; end if;

  -- Mesma ordem de trava de save_criteria_set (equipe, depois membro).
  -- A segunda leitura detecta transferência concorrente antes de usar os critérios.
  select * into m from public.members where id = p_member_id;
  if not found or m.deleted_at is not null then raise exception 'membro_indisponivel' using errcode = 'P0001'; end if;
  if v_role <> 'admin' and private.my_team_id() is distinct from m.team_id then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  v_lock_team := coalesce(m.criteria_set_id, m.team_id);
  perform 1 from public.teams where id = v_lock_team for no key update;
  select * into m from public.members where id = p_member_id for update;
  if not found or m.deleted_at is not null then raise exception 'membro_indisponivel' using errcode = 'P0001'; end if;
  if v_role <> 'admin' and private.my_team_id() is distinct from m.team_id then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if v_lock_team is distinct from coalesce(m.criteria_set_id, m.team_id) then
    raise exception 'perguntas_desatualizadas' using errcode = 'P0001';
  end if;
  if p_cycle is null or char_length(p_cycle) not between 1 and 64 then
    raise exception 'ciclo_invalido' using errcode = '22023';
  end if;
  if p_pdi_goals is null or jsonb_typeof(p_pdi_goals) <> 'array' or jsonb_array_length(p_pdi_goals) > 50 then
    raise exception 'metas_invalidas' using errcode = '22023';
  end if;

  select * into v_existing from public.evaluations
    where member_id = p_member_id and cycle = p_cycle for update;
  v_has_existing := found;
  if v_has_existing and v_role <> 'admin' and v_existing.team_id is distinct from private.my_team_id() then
    raise exception 'avaliacao_historica_sem_acesso' using errcode = '42501';
  end if;
  v_current := case when v_has_existing then v_existing.revision else 0 end;
  if p_expected_revision is distinct from v_current then
    raise exception 'conflito_de_revisao' using errcode = 'P0001';
  end if;

  if v_has_existing then
    select * into v_crit from public.criteria_sets
      where team_id = v_existing.criteria_team_id and version = v_existing.criteria_version;
  else
    select * into v_crit from public.criteria_sets where team_id = v_lock_team order by version desc limit 1;
  end if;
  if not found then raise exception 'equipe_sem_perguntas' using errcode = 'P0001'; end if;
  if p_criteria_team_id is distinct from v_crit.team_id or p_criteria_version is distinct from v_crit.version then
    raise exception 'perguntas_desatualizadas' using errcode = 'P0001';
  end if;

  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'perguntas_desatualizadas' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(i.value ->> 'id' order by i.value ->> 'id'), '{}') into v_expected
    from jsonb_array_elements(v_crit.categories) c, jsonb_array_elements(c.value -> 'items') i;
  select coalesce(array_agg(k order by k), '{}') into v_given from jsonb_object_keys(p_scores) k;
  if v_expected is distinct from v_given then raise exception 'perguntas_desatualizadas' using errcode = 'P0001'; end if;
  for v_entry in select key, value from jsonb_each(p_scores) loop
    if jsonb_typeof(v_entry.value) <> 'number'
       or (v_entry.value #>> '{}')::numeric not between 0 and 5
       or (v_entry.value #>> '{}')::numeric <> trunc((v_entry.value #>> '{}')::numeric) then
      raise exception 'nota_invalida' using errcode = '22023';
    end if;
    v_score := v_score + (v_entry.value #>> '{}')::integer;
  end loop;
  v_status := private.status_for_score(v_score, v_crit.max_score);
  v_id := case when v_has_existing then v_existing.id else
    'evaluation_' || p_member_id || '_' || trim(both '_' from regexp_replace(lower(p_cycle), '[^a-z0-9]+', '_', 'g')) end;

  insert into public.evaluations (id, member_id, cycle, team_id, criteria_team_id, criteria_version, scores, score,
                                  max_score, status, comments, pdi_goals, leader_id, revision)
  values (v_id, p_member_id, p_cycle, case when v_has_existing then v_existing.team_id else m.team_id end,
          v_crit.team_id, v_crit.version, p_scores, v_score, v_crit.max_score, v_status,
          coalesce(p_comments, ''), p_pdi_goals, (select auth.uid()), v_current + 1)
  on conflict (member_id, cycle) do update set
    scores = excluded.scores, score = excluded.score, max_score = excluded.max_score, status = excluded.status,
    comments = excluded.comments, pdi_goals = excluded.pdi_goals, leader_id = excluded.leader_id,
    revision = excluded.revision, updated_at = now();

  v_rank := private.cycle_rank(p_cycle);
  v_is_current := v_rank is null or not exists (
    select 1 from public.evaluations e
    where e.member_id = p_member_id and e.cycle <> p_cycle and private.cycle_rank(e.cycle) > v_rank);
  if v_is_current then
    update public.members set score = v_score, max_score = v_crit.max_score, status = v_status,
      evaluation_status = 'Concluído', pdi_goals = p_pdi_goals, updated_at = now()
    where id = p_member_id;
  end if;

  insert into public.audit_logs (action, evaluation_id, member_id, member_name, cycle, revision, score,
                                 max_score, status, previous_score, previous_status, actor_id)
  values ('evaluation_saved', v_id, p_member_id, m.name, p_cycle, v_current + 1, v_score,
          v_crit.max_score, v_status, v_existing.score, v_existing.status, (select auth.uid()));
  return jsonb_build_object('id', v_id, 'revision', v_current + 1, 'score', v_score,
                            'max_score', v_crit.max_score, 'status', v_status, 'is_current', v_is_current);
end;
$$;

revoke execute on function public.save_evaluation_with_criteria(text, text, jsonb, text, jsonb, integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.save_evaluation_with_criteria(text, text, jsonb, text, jsonb, integer, text, integer) to authenticated;

create or replace function public.save_evaluation(
  p_member_id text, p_cycle text, p_scores jsonb, p_comments text, p_pdi_goals jsonb, p_expected_revision integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if private.my_role() is null then raise exception 'sem_permissao' using errcode = '42501'; end if;
  raise exception 'perguntas_desatualizadas' using errcode = 'P0001';
end;
$$;
revoke execute on function public.save_evaluation(text, text, jsonb, text, jsonb, integer) from public, anon;
grant execute on function public.save_evaluation(text, text, jsonb, text, jsonb, integer) to authenticated;
