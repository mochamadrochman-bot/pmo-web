-- Sena v2 (24 Nov 2026): catatan pemakaian & biaya AI (untuk batas harian & anggaran bulanan),
-- serta indeks teks dokumen (kontrak, addendum, MoM, surat, asuransi) untuk alat cari_dokumen.

create table if not exists ai_usage (
  id bigserial primary key,
  at timestamptz not null default now(),
  username text not null,
  mode text not null default '',          -- cepat | analisis | rapat | draf | klarifikasi
  model text not null default '',
  project text not null default '',
  question text not null default '',
  in_tok integer not null default 0,
  out_tok integer not null default 0,
  cache_write integer not null default 0,
  cache_read integer not null default 0,
  usd numeric not null default 0,
  rounds integer not null default 0,
  status text not null default 'OK',      -- OK | KLARIFIKASI | GAGAL | KOSONG
  counted boolean not null default true    -- dihitung ke batas harian
);
create index if not exists ai_usage_at_idx on ai_usage (at);

create table if not exists doc_text (
  doc_id text primary key,
  project_id text not null,
  kat text not null default '',
  judul text not null default '',
  nomor text not null default '',
  file_id text not null default '',
  pages integer not null default 0,
  ocr_pages integer not null default 0,
  status text not null default 'OK',      -- OK | SEBAGIAN | GAGAL | LEWATI
  error text not null default '',
  content jsonb not null default '[]'::jsonb,  -- [{ p: halaman, t: teks }]
  indexed_at timestamptz not null default now()
);
create index if not exists doc_text_project_idx on doc_text (project_id);
