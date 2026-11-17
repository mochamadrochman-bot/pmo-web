-- Visual 3D per proyek: satu berkas .html mandiri (three.js dsb.) per model, hanya versi terbaru.
create table if not exists model3d (
  id          bigserial primary key,
  project_id  text not null,
  title       text not null,
  note        text,
  file_name   text,
  html        text not null,
  size_bytes  integer not null default 0,
  uploaded_by text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists model3d_project_title on model3d (project_id, lower(title));
