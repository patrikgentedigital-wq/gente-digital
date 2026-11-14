-- Completa o log de auditoria: cadastro de colaborador, equipes, perguntas e perfis de acesso passam a deixar
-- registro mesmo quando a mudança vem direto por SQL (sem passar pelo app).
-- Só vale daqui para frente; o que já foi feito por SQL antes desta migração não tem registro.

-- Mudança feita direto no banco (SQL do painel ou do Claude): sem usuário logado e sem token de API.
-- A edge function usa a chave de serviço, que traz token, e já grava o próprio log; por isso não conta como "direta".
create function private.is_direct_sql() returns boolean
language sql stable set search_path = public
as $$
  select (select auth.uid()) is null and nullif(current_setting('request.jwt.claims', true), '') is null
$$;
revoke execute on function private.is_direct_sql() from public, anon, authenticated;

-- Colaborador cadastrado (o app não registrava).
create function private.members_audit_insert() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_logs (action, member_id, member_name, actor_id)
  values ('member_created', new.id, new.name || ' · ' || new.job_title || ' · ' || new.team_id, (select auth.uid()));
  return new;
end;
$$;
revoke execute on function private.members_audit_insert() from public, anon, authenticated;
create trigger members_audit_insert after insert on public.members
  for each row execute function private.members_audit_insert();

-- Equipe criada, renomeada, recolorida, ativada ou desativada.
create function private.teams_audit_changes() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (action, member_name, actor_id)
    values ('team_created', new.id, (select auth.uid()));
  else
    if new.name is distinct from old.name then
      insert into public.audit_logs (action, member_name, actor_id)
      values ('team_changed', new.id || ' · nome: ' || old.name || ' → ' || new.name, (select auth.uid()));
    end if;
    if new.color is distinct from old.color then
      insert into public.audit_logs (action, member_name, actor_id)
      values ('team_changed', new.id || ' · cor: ' || old.color || ' → ' || new.color, (select auth.uid()));
    end if;
    if new.active is distinct from old.active then
      insert into public.audit_logs (action, member_name, actor_id)
      values ('team_changed', new.id || case when new.active then ' · ativada' else ' · desativada' end, (select auth.uid()));
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function private.teams_audit_changes() from public, anon, authenticated;
create trigger teams_audit_changes after insert or update of name, color, active on public.teams
  for each row execute function private.teams_audit_changes();

-- Perguntas (nova versão do conjunto): a função save_criteria_set do app já grava o log; este cobre só o SQL direto.
create function private.criteria_sets_audit_sql() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if private.is_direct_sql() then
    insert into public.audit_logs (action, member_name, max_score, actor_id)
    values ('criteria_saved', new.team_id || ' · versão ' || new.version || ' (por SQL)', new.max_score, null);
  end if;
  return new;
end;
$$;
revoke execute on function private.criteria_sets_audit_sql() from public, anon, authenticated;
create trigger criteria_sets_audit_sql after insert on public.criteria_sets
  for each row execute function private.criteria_sets_audit_sql();

-- Perfis de acesso: a edge function gerenciar-lideres já grava o log; este cobre só o SQL direto.
create function private.profiles_audit_sql() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  p public.profiles;
begin
  if not private.is_direct_sql() then
    return coalesce(new, old);
  end if;
  p := coalesce(new, old);
  insert into public.audit_logs (action, member_name, actor_id)
  values (
    case tg_op when 'INSERT' then 'profile_created' when 'DELETE' then 'profile_removed' else 'profile_changed' end,
    coalesce(nullif(p.name, ''), p.user_id::text) || ' · ' || p.role || coalesce(' · ' || p.team_id, '') || ' (por SQL)',
    null
  );
  return coalesce(new, old);
end;
$$;
revoke execute on function private.profiles_audit_sql() from public, anon, authenticated;
create trigger profiles_audit_sql after insert or update of role, team_id or delete on public.profiles
  for each row execute function private.profiles_audit_sql();
