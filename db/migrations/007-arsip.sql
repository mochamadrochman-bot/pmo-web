-- Arsip Materi Weekly: akun Google tim per proyek, folder tujuan, dan catatan salinan.
create table if not exists google_project_auth (
  project_id    text primary key,
  email         text,
  refresh_token text not null,
  scope         text,
  folder_id     text,
  folder_name   text,
  connected_at  timestamptz not null default now(),
  connected_by  text
);

create table if not exists arsip_items (
  id           bigserial primary key,
  project_id   text not null,
  item         text not null,          -- VIDEO | MATERI
  week         text not null,          -- W103
  row_idx      integer not null,       -- baris 0-based di DATA MINGGUAN PROYEK
  col_idx      integer not null,
  old_url      text,
  old_file_id  text,
  new_url      text,
  new_file_id  text,
  title        text,
  size_bytes   bigint,
  status       text not null,          -- disalin | diunggah | gagal | dipulihkan
  error        text,
  actor        text,
  created_at   timestamptz not null default now()
);
create index if not exists arsip_items_project on arsip_items (project_id, created_at desc);
