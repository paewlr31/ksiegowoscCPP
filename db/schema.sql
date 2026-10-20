-- Wklej w Neon: SQL Editor -> Run.
-- Forma dzialalnosci, stawka CIT i wybor VAT siedza w kolumnie dane (json).
-- Nowej tabeli ani nowych kolumn nie dodajesz.

create table if not exists firma (
  id int primary key default 1 check (id = 1),
  dane jsonb not null
);

create table if not exists faktury (
  id text primary key,
  dane jsonb not null,
  utworzono timestamptz not null default now()
);

create table if not exists koszty (
  id text primary key,
  dane jsonb not null,
  utworzono timestamptz not null default now()
);

alter table koszty enable row level security;

create table if not exists wysylki (
  id text primary key,
  dane jsonb not null,
  utworzono timestamptz not null default now()
);

alter table wysylki enable row level security;
