-- Corrige o salvamento de ciclos antigos: antes, salvar uma avaliação de um mês passado trocava a nota, o status e as
-- metas atuais do membro (e, portanto, o ranking) pelos daquele mês. Agora só o ciclo mais recente atualiza o membro.
-- O histórico do gráfico continua recebendo todos os ciclos (gatilho da 0005). A resposta ganha "is_current".

-- Ordem de um ciclo no formato do app ("Novembro/2026"): ano * 12 + mês. Outro formato devolve null.
create function private.cycle_rank(p_cycle text) returns integer
language sql immutable set search_path = public
as $$
  select case
    when p_cycle ~ '^(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)/[0-9]{4}$'
    then split_part(p_cycle, '/', 2)::integer * 12
         + array_position(array['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
                          split_part(p_cycle, '/', 1))
  end
$$;
revoke execute on function private.cycle_rank(text) from public, anon;
grant execute on function private.cycle_rank(text) to authenticated;

create or replace function public.save_evaluation(
  p_member_id text, p_cycle text, p_scores jsonb, p_comments text, p_pdi_goals jsonb, p_expected_revision integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := private.my_role();
  m public.members%rowtype;
  v_crit record;
  v_crit_team text;
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

  select * into m from public.members where id = p_member_id for update;
  if not found or m.deleted_at is not null then
    raise exception 'membro_indisponivel' using errcode = 'P0001';
  end if;
  if v_role <> 'admin' and private.my_team_id() is distinct from m.team_id then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  if p_cycle is null or char_length(p_cycle) not between 1 and 64 then
    raise exception 'ciclo_invalido' using errcode = '22023';
  end if;
  if p_pdi_goals is null or jsonb_typeof(p_pdi_goals) <> 'array' or jsonb_array_length(p_pdi_goals) > 50 then
    raise exception 'metas_invalidas' using errcode = '22023';
  end if;

  v_crit_team := private.member_criteria_team(m);
  select * into v_crit from private.latest_criteria(v_crit_team);
  if v_crit.version is null then raise exception 'equipe_sem_perguntas' using errcode = 'P0001'; end if;

  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'perguntas_desatualizadas' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(i.value ->> 'id' order by i.value ->> 'id'), '{}') into v_expected
  from jsonb_array_elements(v_crit.categories) c, jsonb_array_elements(c.value -> 'items') i;
  select coalesce(array_agg(k order by k), '{}') into v_given from jsonb_object_keys(p_scores) k;
  if v_expected is distinct from v_given then
    raise exception 'perguntas_desatualizadas' using errcode = 'P0001';
  end if;

  for v_entry in select key, value from jsonb_each(p_scores) loop
    if jsonb_typeof(v_entry.value) <> 'number'
       or (v_entry.value #>> '{}')::numeric not between 0 and 5
       or (v_entry.value #>> '{}')::numeric <> trunc((v_entry.value #>> '{}')::numeric) then
      raise exception 'nota_invalida' using errcode = '22023';
    end if;
    v_score := v_score + (v_entry.value #>> '{}')::integer;
  end loop;
  v_status := private.status_for_score(v_score, v_crit.max_score);

  select revision into v_current from public.evaluations where member_id = p_member_id and cycle = p_cycle for update;
  v_current := coalesce(v_current, 0);
  if p_expected_revision is distinct from v_current then
    raise exception 'conflito_de_revisao' using errcode = 'P0001';
  end if;

  v_id := 'evaluation_' || p_member_id || '_' ||
          trim(both '_' from regexp_replace(lower(p_cycle), '[^a-z0-9]+', '_', 'g'));

  insert into public.evaluations (id, member_id, cycle, team_id, criteria_team_id, criteria_version, scores, score,
                                  max_score, status, comments, pdi_goals, leader_id, revision)
  values (v_id, p_member_id, p_cycle, m.team_id, v_crit_team, v_crit.version, p_scores, v_score, v_crit.max_score,
          v_status, coalesce(p_comments, ''), p_pdi_goals, (select auth.uid()), v_current + 1)
  on conflict (member_id, cycle) do update set
    team_id = excluded.team_id, criteria_team_id = excluded.criteria_team_id,
    criteria_version = excluded.criteria_version, scores = excluded.scores,
    score = excluded.score, max_score = excluded.max_score, status = excluded.status,
    comments = excluded.comments, pdi_goals = excluded.pdi_goals, leader_id = excluded.leader_id,
    revision = excluded.revision, updated_at = now();

  -- Corrigir um ciclo antigo não pode trocar a nota atual do membro: só vale se não houver ciclo mais novo.
  v_rank := private.cycle_rank(p_cycle);
  v_is_current := v_rank is null or not exists (
    select 1 from public.evaluations e
    where e.member_id = p_member_id and e.cycle <> p_cycle and private.cycle_rank(e.cycle) > v_rank);

  if v_is_current then
    update public.members set
      score = v_score, max_score = v_crit.max_score, status = v_status,
      evaluation_status = 'Concluído', pdi_goals = p_pdi_goals, updated_at = now()
    where id = p_member_id;
  end if;

  insert into public.audit_logs (action, evaluation_id, member_id, member_name, cycle, revision, score,
                                 max_score, status, previous_score, previous_status, actor_id)
  values ('evaluation_saved', v_id, p_member_id, m.name, p_cycle, v_current + 1, v_score,
          v_crit.max_score, v_status, m.score, m.status, (select auth.uid()));

  return jsonb_build_object('id', v_id, 'revision', v_current + 1, 'score', v_score,
                            'max_score', v_crit.max_score, 'status', v_status,
                            'is_current', v_is_current);
end;
$$;
