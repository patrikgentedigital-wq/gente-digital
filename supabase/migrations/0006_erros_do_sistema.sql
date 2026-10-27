-- Erros que acontecem no navegador de quem está logado. Só o admin lê e marca como resolvido.

create table public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  source text not null check (source in ('window', 'promise', 'boundary', 'save')),
  message text not null check (char_length(message) between 1 and 1000),
  stack text check (char_length(stack) <= 4000),
  url text check (char_length(url) <= 500),
  user_agent text check (char_length(user_agent) <= 300),
  resolved_at timestamptz
);
create index client_errors_open_idx on public.client_errors (created_at desc) where resolved_at is null;
alter table public.client_errors enable row level security;

grant select on public.client_errors to authenticated;
grant update (resolved_at) on public.client_errors to authenticated;

create policy client_errors_admin_select on public.client_errors for select to authenticated
  using (private.my_role() = 'admin');
create policy client_errors_admin_update on public.client_errors for update to authenticated
  using (private.my_role() = 'admin') with check (private.my_role() = 'admin');

-- Quem reporta é qualquer conta com perfil; anônimo e conta sem perfil são ignorados em silêncio.
-- Limites: 20 erros por pessoa a cada 10 minutos, e a mesma mensagem não repete em 1 minuto.
create function public.report_client_error(
  p_source text, p_message text, p_stack text, p_url text, p_user_agent text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_message text := left(coalesce(btrim(p_message), ''), 1000);
begin
  if v_user is null or private.my_role() is null or v_message = '' then return; end if;
  if p_source is null or p_source not in ('window', 'promise', 'boundary', 'save') then return; end if;
  if (select count(*) from public.client_errors
      where user_id = v_user and created_at > now() - interval '10 minutes') >= 20 then return; end if;
  if exists (select 1 from public.client_errors
             where user_id = v_user and message = v_message and created_at > now() - interval '1 minute') then return; end if;

  insert into public.client_errors (user_id, source, message, stack, url, user_agent)
  values (v_user, p_source, v_message, left(p_stack, 4000), left(p_url, 500), left(p_user_agent, 300));
end;
$$;

revoke execute on function public.report_client_error(text, text, text, text, text) from public, anon;
grant execute on function public.report_client_error(text, text, text, text, text) to authenticated;
