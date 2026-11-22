-- Isu manajemen untuk mode presentasi (Monthly Executive Review & Weekly). Satu sumber:
-- isu yang belum selesai tampil terus di periode berikutnya sampai ditandai Selesai.
create table if not exists pres_issues (
  id bigserial primary key,
  project_id text not null,
  category text not null default 'Lainnya',
  title text not null,
  detail text not null default '',
  ask text not null default '',
  severity text not null default 'Sedang',
  status text not null default 'Baru',
  pic text not null default '',
  target date,
  created_by text,
  created_at timestamptz not null default now(),
  updated_by text,
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists pres_issues_project_idx on pres_issues (project_id);
create index if not exists pres_issues_open_idx on pres_issues (status, closed_at);
