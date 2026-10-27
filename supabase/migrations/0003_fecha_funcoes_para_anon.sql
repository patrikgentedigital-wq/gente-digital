-- Corrige a 0002: as funções public.* foram criadas depois do REVOKE e nasceram executáveis por anon/PUBLIC.
-- O teste supabase/tests/security.sql (caso "anônimo chama save_evaluation") pegou a falha.

revoke execute on function
  public.save_criteria_set(text, jsonb),
  public.save_evaluation(text, text, jsonb, text, jsonb, integer),
  public.archive_member(text),
  public.restore_member(text)
from public, anon;

grant execute on function
  public.save_criteria_set(text, jsonb),
  public.save_evaluation(text, text, jsonb, text, jsonb, integer),
  public.archive_member(text),
  public.restore_member(text)
to authenticated;

-- Objetos futuros em public não nascem abertos para anon/authenticated: cada migração concede só o que precisa.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
