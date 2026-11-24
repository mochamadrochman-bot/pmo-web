-- Input Progress Mingguan: unggah video/materi ke Drive akun tim proyek + kiriman kontraktor (25 Nov 2026).

-- Kiriman kontraktor (HSE + link video/materi) per proyek & minggu, menunggu disimpan PIC/Admin.
create table if not exists ktr_weekly (
  project_id   text not null,
  week         integer not null,
  hse_enabled  boolean not null default true,
  hse          jsonb,
  video_url    text,
  material_url text,
  report_date  text,
  status       text not null default 'BARU',   -- BARU | DIPAKAI
  by_user      text,
  by_name      text,
  updated_at   timestamptz not null default now(),
  used_by      text,
  used_at      timestamptz,
  primary key (project_id, week)
);

-- File yang diunggah lewat halaman input (di Drive akun tim proyek).
create table if not exists weekly_uploads (
  id          bigserial primary key,
  project_id  text not null,
  week        integer not null,
  kind        text not null,                    -- VIDEO | MATERI
  file_id     text not null unique,
  url         text not null,
  name        text,
  size_bytes  bigint,
  status      text not null default 'BARU',     -- BARU | AKTIF | DIBUANG
  uploaded_by text,
  uploaded_at timestamptz not null default now(),
  trashed_at  timestamptz,
  note        text
);
create index if not exists weekly_uploads_pw on weekly_uploads (project_id, week);
