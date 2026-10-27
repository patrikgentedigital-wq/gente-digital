-- Realtime: o app recarrega a lista quando membros ou auditoria mudam. A RLS continua valendo para quem escuta.
alter publication supabase_realtime add table public.members, public.audit_logs;
