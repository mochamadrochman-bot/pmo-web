-- Skema awal Jalur B. Sesuaikan dengan kamus data B1 sebelum dipakai produksi.

create extension if not exists "pgcrypto";

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  full_name     text not null default '',
  role          text not null default 'viewer'
                check (role in ('admin', 'input', 'reviewer', 'viewer')),
  hash          text not null,
  salt          text,
  algo          text not null default 'argon2id',
  status        text not null default 'aktif',
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists sessions (
  token       text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  user_agent  text
);

create index if not exists sessions_user_idx on sessions(user_id);
create index if not exists sessions_expiry_idx on sessions(expires_at);

create table if not exists projects (
  id          text primary key,
  name        text not null,
  status      text not null default 'draft',
  owner       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists items (
  id          bigserial primary key,
  project_id  text not null references projects(id) on delete cascade,
  code        text not null,
  name        text not null,
  weight      numeric(6,3) not null default 0,
  required    boolean not null default true,
  unique (project_id, code)
);

-- Inti transformasi: kolom WEEK di Sheets menjadi baris di sini.
create table if not exists progress (
  project_id  text not null references projects(id) on delete cascade,
  item_id     bigint not null references items(id) on delete cascade,
  week_no     smallint not null check (week_no between 1 and 53),
  actual      numeric(6,3) not null default 0,
  cumulative  numeric(6,3) not null default 0,
  updated_by  uuid references users(id),
  updated_at  timestamptz not null default now(),
  primary key (project_id, item_id, week_no)
);

create index if not exists progress_week_idx on progress(project_id, week_no);

create table if not exists audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid references users(id),
  actor_name  text,
  action      text not null,
  entity      text,
  entity_id   text,
  detail      jsonb
);

create index if not exists audit_at_idx on audit_log(at desc);
