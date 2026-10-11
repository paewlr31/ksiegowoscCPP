-- Wklej w Supabase: SQL Editor -> Run.
-- Klucz service_role (tylko serwer) omija RLS.
-- Klucz anon nie ma polityk, więc z przeglądarki do tabel nie wejdzie.

create table if not exists firma (
  id int primary key default 1 check (id = 1),
  dane jsonb not null
);

create table if not exists faktury (
  id text primary key,
  dane jsonb not null,
  utworzono timestamptz not null default now()
);

alter table firma enable row level security;
alter table faktury enable row level security;
