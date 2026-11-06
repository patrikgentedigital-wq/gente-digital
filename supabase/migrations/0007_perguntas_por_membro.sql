-- Perguntas por membro: um membro pode ser avaliado com as perguntas de outro "conjunto" (uma linha em teams)
-- em vez das da própria equipe. Caso de uso: a Mariza Leite avalia Danielle e Alexandre com formulários próprios.
-- A avaliação continua gravada na equipe do membro (evaluations.team_id), então o acesso por equipe não muda.

alter table public.members
  add column criteria_set_id text references public.teams (id);

-- Qual conjunto de perguntas vale para o membro.
create function private.member_criteria_team(p_member public.members) returns text
language sql immutable set search_path = public
as $$ select coalesce(p_member.criteria_set_id, p_member.team_id) $$;
revoke execute on function private.member_criteria_team(public.members) from public, anon;
grant execute on function private.member_criteria_team(public.members) to authenticated;

-- A avaliação passa a apontar para o conjunto usado (e não mais, por obrigação, para a equipe do membro).
alter table public.evaluations add column criteria_team_id text;
update public.evaluations set criteria_team_id = team_id;
alter table public.evaluations alter column criteria_team_id set not null;
alter table public.evaluations drop constraint evaluations_team_id_criteria_version_fkey;
alter table public.evaluations
  add foreign key (criteria_team_id, criteria_version) references public.criteria_sets (team_id, version);

-- Membro novo: máximo do conjunto vigente.
create or replace function private.members_before_write() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.max_score := coalesce(
      (select max_score from public.criteria_sets
       where team_id = coalesce(new.criteria_set_id, new.team_id) order by version desc limit 1), 0);
    new.score := 0;
    new.status := 'Alarme';
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Editar as perguntas atualiza só quem usa aquele conjunto e ainda não foi avaliado.
create or replace function public.save_criteria_set(p_team_id text, p_categories jsonb) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := private.my_role();
  v_error text;
  v_version integer;
  v_max integer;
begin
  if v_role is null or (v_role <> 'admin' and private.my_team_id() is distinct from p_team_id) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  perform 1 from public.teams where id = p_team_id for update;
  if not found then raise exception 'equipe_inexistente' using errcode = '22023'; end if;

  v_error := private.categories_error(p_categories);
  if v_error is not null then
    raise exception 'perguntas_invalidas: %', v_error using errcode = '22023';
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.criteria_sets where team_id = p_team_id;
  select count(*) * 5 into v_max
  from jsonb_array_elements(p_categories) c, jsonb_array_elements(c.value -> 'items');

  insert into public.criteria_sets (team_id, version, categories, max_score, created_by)
  values (p_team_id, v_version, p_categories, v_max, (select auth.uid()));

  update public.members m set max_score = v_max
  where coalesce(m.criteria_set_id, m.team_id) = p_team_id
    and not exists (select 1 from public.evaluations e where e.member_id = m.id);

  insert into public.audit_logs (action, member_id, max_score, actor_id)
  values ('criteria_saved', p_team_id, v_max, (select auth.uid()));

  return jsonb_build_object('team_id', p_team_id, 'version', v_version, 'max_score', v_max);
end;
$$;

-- save_evaluation usa o conjunto do membro; o resto da função é igual ao da migração 0002.
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

  update public.members set
    score = v_score, max_score = v_crit.max_score, status = v_status,
    evaluation_status = 'Concluído', pdi_goals = p_pdi_goals, updated_at = now()
  where id = p_member_id;

  insert into public.audit_logs (action, evaluation_id, member_id, member_name, cycle, revision, score,
                                 max_score, status, previous_score, previous_status, actor_id)
  values ('evaluation_saved', v_id, p_member_id, m.name, p_cycle, v_current + 1, v_score,
          v_crit.max_score, v_status, m.score, m.status, (select auth.uid()));

  return jsonb_build_object('id', v_id, 'revision', v_current + 1, 'score', v_score,
                            'max_score', v_crit.max_score, 'status', v_status);
end;
$$;

-- O ranking passa a expor qual conjunto de perguntas vale para cada membro (coluna nova, no fim da view).
create or replace view public.members_ranked
with (security_invoker = true) as
 SELECT m.id,
    m.name,
    m.job_title,
    m.team_id,
    t.color AS team_color,
    m.avatar_url,
    m.email,
    m.evaluation_status,
    m.score,
    m.max_score,
    m.status,
    m.current_rating,
    m.history,
    m.pdi_goals,
        CASE
            WHEN (m.max_score > 0) THEN (((m.score)::numeric * 100.0) / (m.max_score)::numeric)
            ELSE (0)::numeric
        END AS percent,
    row_number() OVER (ORDER BY
        CASE
            WHEN (m.max_score > 0) THEN (((m.score)::numeric * 100.0) / (m.max_score)::numeric)
            ELSE (0)::numeric
        END DESC, m.name) AS rank,
    coalesce(m.criteria_set_id, m.team_id) AS criteria_team_id
   FROM (members m
     JOIN teams t ON ((t.id = m.team_id)))
  WHERE (m.deleted_at IS NULL);
