-- Document Control: isian tambahan MoM / surat masuk / surat keluar + daftar tindak lanjut MoM (22 Nov 2026).
-- Register utama tetap di DOC_REGISTER (nomor, perihal = JUDUL, tanggal, pihak). Tabel ini menyimpan isian khusus
-- (kepada, penandatangan, tempat, peserta, notulis, ...) per dokumen, serta butir tindak lanjut.

create table if not exists doc_meta (
  doc_id text primary key,               -- ID register (Dxxxxxxxx)
  project_id text not null,
  kat text not null,                     -- MOM | SURAT_MASUK | SURAT_KELUAR
  data jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);
create index if not exists doc_meta_project_idx on doc_meta (project_id);

create table if not exists doc_actions (
  id bigserial primary key,
  doc_id text not null,
  project_id text not null,
  no integer not null default 1,
  uraian text not null,
  pic text not null default '',
  pihak text not null default 'PKG',     -- PKG | KONTRAKTOR | LAIN
  due date,
  status text not null default 'TERBUKA',-- TERBUKA | PROSES | SELESAI
  catatan text not null default '',
  bukti text not null default '',        -- link bukti penyelesaian (https)
  created_by text,
  created_at timestamptz not null default now(),
  updated_by text,
  updated_at timestamptz not null default now()
);
create index if not exists doc_actions_project_idx on doc_actions (project_id);
create index if not exists doc_actions_doc_idx on doc_actions (doc_id);
