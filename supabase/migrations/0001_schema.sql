-- Quadro de Desempenho: esquema inicial.
-- RLS já nasce ligada e sem políticas (nega tudo); as políticas e funções vêm na migração 0002.

create table public.teams (
  id text primary key check (char_length(id) between 1 and 100),
  name text not null check (char_length(name) between 1 and 100),
  color text not null default '#86868b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'leader')),
  team_id text references public.teams (id),
  name text not null default '',
  created_at timestamptz not null default now()
);

create table public.members (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{1,128}$'),
  name text not null check (char_length(name) between 1 and 100),
  job_title text not null check (char_length(job_title) between 1 and 120),
  team_id text not null references public.teams (id),
  avatar_url text not null default '' check (avatar_url = '' or avatar_url ~ '^https://'),
  email text not null default '' check (char_length(email) <= 254),
  evaluation_status text not null default 'Pendente'
    check (evaluation_status in ('Pendente', 'Forms Respondido', 'Concluído')),
  score integer not null default 0 check (score >= 0),
  max_score integer not null default 0 check (max_score >= 0),
  status text not null default 'Alarme'
    check (status in ('Voando', 'Caminho Certo', 'Atenção', 'Alarme')),
  current_rating numeric check (current_rating between 0 and 5),
  history jsonb not null default '[]' check (jsonb_typeof(history) = 'array'),
  pdi_goals jsonb not null default '[]' check (jsonb_typeof(pdi_goals) = 'array'),
  deleted_at timestamptz,
  deleted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (score <= max_score)
);
create index members_team_id_idx on public.members (team_id);

-- Só se insere: editar as perguntas cria uma versão nova; a vigente é a de maior versão.
create table public.criteria_sets (
  team_id text not null references public.teams (id),
  version integer not null check (version >= 1),
  categories jsonb not null check (jsonb_typeof(categories) = 'array'),
  max_score integer not null check (max_score > 0),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (team_id, version)
);

create table public.evaluations (
  id text primary key,
  member_id text not null references public.members (id),
  cycle text not null check (char_length(cycle) between 1 and 64),
  team_id text not null,
  criteria_version integer not null,
  scores jsonb not null check (jsonb_typeof(scores) = 'object'),
  score integer not null check (score >= 0),
  max_score integer not null check (max_score > 0),
  status text not null check (status in ('Voando', 'Caminho Certo', 'Atenção', 'Alarme')),
  comments text not null default '' check (char_length(comments) <= 5000),
  pdi_goals jsonb not null default '[]' check (jsonb_typeof(pdi_goals) = 'array'),
  leader_id uuid references auth.users (id),
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, cycle),
  foreign key (team_id, criteria_version) references public.criteria_sets (team_id, version),
  check (score <= max_score)
);
create index evaluations_member_id_idx on public.evaluations (member_id);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  action text not null,
  evaluation_id text,
  member_id text,
  member_name text,
  cycle text,
  revision integer,
  score integer,
  max_score integer,
  status text,
  previous_score integer,
  previous_status text,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create function public.audit_logs_append_only() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_logs é só de inserção';
end;
$$;

create trigger audit_logs_no_update_delete
before update or delete on public.audit_logs
for each row execute function public.audit_logs_append_only();

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.criteria_sets enable row level security;
alter table public.evaluations enable row level security;
alter table public.audit_logs enable row level security;

-- Ranking por percentual do máximo da equipe. security_invoker: a RLS de members vale para quem consulta.
create view public.members_ranked
with (security_invoker = true) as
select
  m.id,
  m.name,
  m.job_title,
  m.team_id,
  t.color as team_color,
  m.avatar_url,
  m.email,
  m.evaluation_status,
  m.score,
  m.max_score,
  m.status,
  m.current_rating,
  m.history,
  m.pdi_goals,
  case when m.max_score > 0 then m.score * 100.0 / m.max_score else 0 end as percent,
  row_number() over (
    order by case when m.max_score > 0 then m.score * 100.0 / m.max_score else 0 end desc, m.name
  ) as rank
from public.members m
join public.teams t on t.id = m.team_id
where m.deleted_at is null;
