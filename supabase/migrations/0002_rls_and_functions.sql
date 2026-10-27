-- Segurança: privilégios, políticas RLS e funções de gravação (save_evaluation, save_criteria_set, archive/restore).
-- O navegador só lê (RLS) e chama as funções; notas, totais e status são calculados aqui, no servidor.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Papel e equipe de quem está logado, vindos de profiles (nunca de claims do token).
create function private.my_role() returns text
language sql stable security definer set search_path = public
as $$ select role from public.profiles where user_id = (select auth.uid()) $$;

create function private.my_team_id() returns text
language sql stable security definer set search_path = public
as $$ select team_id from public.profiles where user_id = (select auth.uid()) $$;

-- Faixas de 155 pontos como percentual do máximo, em inteiros (igual a src/lib/scoring.ts).
create function private.status_for_score(p_score integer, p_max integer) returns text
language sql immutable set search_path = public
as $$
  select case
    when p_max <= 0 then 'Alarme'
    when p_score * 155 > 140 * p_max then 'Voando'
    when p_score * 155 > 130 * p_max then 'Caminho Certo'
    when p_score * 155 >= 120 * p_max then 'Atenção'
    else 'Alarme'
  end
$$;

-- Devolve a mensagem do primeiro problema nas categorias, ou null se estiverem válidas.
create function private.categories_error(p jsonb) returns text
language plpgsql immutable set search_path = public
as $$
declare
  cat jsonb;
  item jsonb;
  total integer := 0;
  seen text[] := '{}';
  item_id text;
  item_text text;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return 'as categorias devem ser uma lista'; end if;
  if jsonb_array_length(p) > 10 then return 'no máximo 10 categorias'; end if;
  for cat in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(cat) <> 'object' then return 'categoria inválida'; end if;
    if jsonb_typeof(cat -> 'name') is distinct from 'string'
       or btrim(cat ->> 'name') = '' or char_length(cat ->> 'name') > 100 then
      return 'toda categoria precisa de nome de até 100 caracteres';
    end if;
    if jsonb_typeof(cat -> 'items') is distinct from 'array' then return 'categoria sem lista de perguntas'; end if;
    if jsonb_array_length(cat -> 'items') > 15 then return 'no máximo 15 perguntas por categoria'; end if;
    for item in select value from jsonb_array_elements(cat -> 'items') loop
      if jsonb_typeof(item) <> 'object' then return 'pergunta inválida'; end if;
      item_id := item ->> 'id';
      if jsonb_typeof(item -> 'id') is distinct from 'string' or item_id !~ '^[A-Za-z0-9_-]{1,32}$' then
        return 'pergunta com id inválido';
      end if;
      if item_id = any (seen) then return 'os ids das perguntas precisam ser únicos'; end if;
      seen := seen || item_id;
      item_text := item ->> 'text';
      if jsonb_typeof(item -> 'text') is distinct from 'string'
         or btrim(item_text) = '' or char_length(btrim(item_text)) > 200 then
        return 'toda pergunta precisa de texto de até 200 caracteres';
      end if;
      total := total + 1;
    end loop;
  end loop;
  if total = 0 then return 'inclua ao menos uma pergunta'; end if;
  return null;
end;
$$;

-- max_score de um membro novo = máximo vigente da equipe; updated_at nas edições.
create function private.members_before_write() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.max_score := coalesce(
      (select max_score from public.criteria_sets where team_id = new.team_id order by version desc limit 1), 0);
    new.score := 0;
    new.status := 'Alarme';
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger members_before_write
before insert or update on public.members
for each row execute function private.members_before_write();

-- Perguntas vigentes da equipe: a versão de maior número.
create function private.latest_criteria(p_team_id text)
returns table (version integer, categories jsonb, max_score integer)
language sql stable security definer set search_path = public
as $$
  select c.version, c.categories, c.max_score
  from public.criteria_sets c where c.team_id = p_team_id
  order by c.version desc limit 1
$$;

-- ---------------------------------------------------------------- privilégios
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

grant select on public.teams, public.profiles, public.members, public.criteria_sets,
  public.evaluations, public.audit_logs, public.members_ranked to authenticated;
-- O admin cadastra e edita só estes campos; pontuação nunca é gravada direto.
grant insert (id, name, job_title, team_id, avatar_url, email) on public.members to authenticated;
grant update (name, job_title, team_id, avatar_url, email) on public.members to authenticated;

-- ------------------------------------------------------------------- políticas
create policy teams_select on public.teams for select to authenticated
  using (private.my_role() = 'admin' or id = private.my_team_id());

create policy profiles_select on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or private.my_role() = 'admin');

create policy members_select on public.members for select to authenticated
  using (private.my_role() = 'admin' or team_id = private.my_team_id());
create policy members_admin_insert on public.members for insert to authenticated
  with check (private.my_role() = 'admin');
create policy members_admin_update on public.members for update to authenticated
  using (private.my_role() = 'admin') with check (private.my_role() = 'admin');

create policy criteria_select on public.criteria_sets for select to authenticated
  using (private.my_role() = 'admin' or team_id = private.my_team_id());

create policy evaluations_select on public.evaluations for select to authenticated
  using (private.my_role() = 'admin' or team_id = private.my_team_id());

create policy audit_logs_select on public.audit_logs for select to authenticated
  using (private.my_role() = 'admin');

-- ---------------------------------------------------------------------- funções
create function public.save_criteria_set(p_team_id text, p_categories jsonb) returns jsonb
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

  -- Quem ainda não foi avaliado passa a mostrar o máximo das perguntas novas.
  update public.members m set max_score = v_max
  where m.team_id = p_team_id
    and not exists (select 1 from public.evaluations e where e.member_id = m.id);

  insert into public.audit_logs (action, member_id, max_score, actor_id)
  values ('criteria_saved', p_team_id, v_max, (select auth.uid()));

  return jsonb_build_object('team_id', p_team_id, 'version', v_version, 'max_score', v_max);
end;
$$;

create function public.save_evaluation(
  p_member_id text, p_cycle text, p_scores jsonb, p_comments text, p_pdi_goals jsonb, p_expected_revision integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := private.my_role();
  m public.members%rowtype;
  v_crit record;
  v_expected text[];
  v_given text[];
  v_current integer;
  v_score integer := 0;
  v_status text;
  v_id text;
  v_entry record;
begin
  if v_role is null then raise exception 'sem_permissao' using errcode = '42501'; end if;

  -- Trava o membro: duas gravações da mesma avaliação passam uma de cada vez.
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

  select * into v_crit from private.latest_criteria(m.team_id);
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

  insert into public.evaluations (id, member_id, cycle, team_id, criteria_version, scores, score, max_score,
                                  status, comments, pdi_goals, leader_id, revision)
  values (v_id, p_member_id, p_cycle, m.team_id, v_crit.version, p_scores, v_score, v_crit.max_score,
          v_status, coalesce(p_comments, ''), p_pdi_goals, (select auth.uid()), v_current + 1)
  on conflict (member_id, cycle) do update set
    team_id = excluded.team_id, criteria_version = excluded.criteria_version, scores = excluded.scores,
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

create function public.archive_member(p_member_id text) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if private.my_role() is distinct from 'admin' then raise exception 'sem_permissao' using errcode = '42501'; end if;
  update public.members set deleted_at = now(), deleted_by = (select auth.uid())::text
  where id = p_member_id and deleted_at is null;
  if not found then raise exception 'membro_indisponivel' using errcode = 'P0001'; end if;
  insert into public.audit_logs (action, member_id, actor_id) values ('member_archived', p_member_id, (select auth.uid()));
end;
$$;

create function public.restore_member(p_member_id text) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if private.my_role() is distinct from 'admin' then raise exception 'sem_permissao' using errcode = '42501'; end if;
  update public.members set deleted_at = null, deleted_by = null
  where id = p_member_id and deleted_at is not null;
  if not found then raise exception 'membro_indisponivel' using errcode = 'P0001'; end if;
  insert into public.audit_logs (action, member_id, actor_id) values ('member_restored', p_member_id, (select auth.uid()));
end;
$$;

grant execute on function
  public.save_criteria_set(text, jsonb),
  public.save_evaluation(text, text, jsonb, text, jsonb, integer),
  public.archive_member(text),
  public.restore_member(text)
to authenticated;
