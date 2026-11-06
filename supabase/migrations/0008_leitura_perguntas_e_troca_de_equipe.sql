-- Corrige dois efeitos colaterais das perguntas por membro (0007) e adiciona índices que faltavam.

-- 1) Um líder precisa ler o conjunto de perguntas próprio dos membros da equipe dele (ex.: "Mariza Leite - Danielle"),
--    senão a tela de avaliação dele diria "equipe sem perguntas".
drop policy criteria_select on public.criteria_sets;
create policy criteria_select on public.criteria_sets for select to authenticated
  using (
    private.my_role() = 'admin'
    or team_id = private.my_team_id()
    or exists (
      select 1 from public.members m
      where m.criteria_set_id = criteria_sets.team_id and m.team_id = private.my_team_id()
    )
  );

-- 2) Mover um membro (ou trocar o conjunto dele) antes da primeira avaliação atualiza o máximo para o do novo conjunto.
--    Quem já foi avaliado mantém o máximo da avaliação, para a pontuação continuar coerente.
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
    if (new.team_id is distinct from old.team_id or new.criteria_set_id is distinct from old.criteria_set_id)
       and not exists (select 1 from public.evaluations e where e.member_id = new.id) then
      new.max_score := coalesce(
        (select max_score from public.criteria_sets
         where team_id = coalesce(new.criteria_set_id, new.team_id) order by version desc limit 1), 0);
    end if;
  end if;
  return new;
end;
$$;

-- 3) Índices nas chaves estrangeiras apontadas pelo verificador de desempenho do Supabase.
create index members_criteria_set_id_idx on public.members (criteria_set_id);
create index evaluations_criteria_idx on public.evaluations (criteria_team_id, criteria_version);
create index evaluations_leader_id_idx on public.evaluations (leader_id);
create index criteria_sets_created_by_idx on public.criteria_sets (created_by);
create index profiles_team_id_idx on public.profiles (team_id);
create index client_errors_user_id_idx on public.client_errors (user_id);
