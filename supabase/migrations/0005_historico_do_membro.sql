-- Mantém members.history (mês e pontuação, usado no gráfico de evolução) a cada avaliação salva.
-- Uma avaliação regravada no mesmo ciclo substitui a entrada daquele ciclo.

create function private.evaluations_sync_history() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.members m
  set history = coalesce(
        (select jsonb_agg(entry order by position)
         from jsonb_array_elements(m.history) with ordinality as t(entry, position)
         where entry ->> 'month' is distinct from new.cycle),
        '[]'::jsonb)
      || jsonb_build_array(jsonb_build_object('month', new.cycle, 'score', new.score))
  where m.id = new.member_id;
  return new;
end;
$$;

create trigger evaluations_sync_history
after insert or update of score, cycle on public.evaluations
for each row execute function private.evaluations_sync_history();
