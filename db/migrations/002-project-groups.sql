-- Kelompok proyek: Pengembangan, Rutin, atau Sub-proyek dari proyek Pengembangan.
-- Disimpan di database (bukan di spreadsheet) supaya tidak tertimpa saat sinkron atau impor.
-- Proyek yang tidak tercatat di sini dianggap PENGEMBANGAN.
create table if not exists project_groups (
  project_id text primary key,
  group_type text not null default 'PENGEMBANGAN' check (group_type in ('PENGEMBANGAN', 'RUTIN', 'SUB')),
  parent_id  text,
  updated_at timestamptz not null default now(),
  updated_by text
);
