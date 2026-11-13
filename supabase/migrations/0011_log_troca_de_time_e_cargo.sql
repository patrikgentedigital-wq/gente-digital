-- Registra no log de auditoria quando um colaborador troca de time, de cargo ou de nome, e quem fez a troca.
-- Vale para qualquer caminho (tela, assistente ou SQL): o registro nasce do próprio banco.

create function private.members_audit_changes() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.team_id is distinct from old.team_id then
    insert into public.audit_logs (action, member_id, member_name, actor_id)
    values ('member_team_changed', new.id, new.name || ' · ' || old.team_id || ' → ' || new.team_id, (select auth.uid()));
  end if;
  if new.job_title is distinct from old.job_title then
    insert into public.audit_logs (action, member_id, member_name, actor_id)
    values ('member_job_changed', new.id, new.name || ' · ' || old.job_title || ' → ' || new.job_title, (select auth.uid()));
  end if;
  if new.name is distinct from old.name then
    insert into public.audit_logs (action, member_id, member_name, actor_id)
    values ('member_renamed', new.id, old.name || ' → ' || new.name, (select auth.uid()));
  end if;
  return new;
end;
$$;
revoke execute on function private.members_audit_changes() from public, anon, authenticated;

create trigger members_audit_changes
  after update of team_id, job_title, name on public.members
  for each row execute function private.members_audit_changes();
