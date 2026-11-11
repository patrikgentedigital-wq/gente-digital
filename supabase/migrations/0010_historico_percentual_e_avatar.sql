-- 1) O histórico do membro passa a guardar também o máximo de cada avaliação (cada pessoa pode ter um conjunto de
--    perguntas com máximo diferente: 150, 155, 175...), e fica em ordem de calendário. Antes, regravar um ciclo
--    antigo (correção) empurrava a entrada dele para o fim da lista.
create or replace function private.evaluations_sync_history() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.members m
  set history = (
    select coalesce(jsonb_agg(x.entry order by private.cycle_rank(x.entry ->> 'month') nulls last, x.pos), '[]'::jsonb)
    from (
      select entry, position as pos
      from jsonb_array_elements(m.history) with ordinality as t(entry, position)
      where entry ->> 'month' is distinct from new.cycle
      union all
      select jsonb_build_object('month', new.cycle, 'score', new.score, 'max', new.max_score), 1000000
    ) x
  )
  where m.id = new.member_id;
  return new;
end;
$$;

-- Entradas que já existiam: ganham o máximo da avaliação do mesmo ciclo (quando há) e entram na ordem de calendário.
update public.members m
set history = (
  select coalesce(jsonb_agg(
           case
             when t.entry ? 'max' then t.entry
             else t.entry || coalesce(
               (select jsonb_build_object('max', e.max_score)
                from public.evaluations e
                where e.member_id = m.id and e.cycle = t.entry ->> 'month'),
               '{}'::jsonb)
           end
           order by private.cycle_rank(t.entry ->> 'month') nulls last, t.pos), '[]'::jsonb)
  from jsonb_array_elements(m.history) with ordinality as t(entry, pos)
)
where jsonb_array_length(m.history) > 0;

-- 2) O avatar padrão antigo mandava o nome da pessoa para um serviço externo (dicebear.com). Sem foto, o app
--    mostra as iniciais, então o campo volta a ficar vazio.
update public.members set avatar_url = '' where avatar_url like 'https://api.dicebear.com/%';
