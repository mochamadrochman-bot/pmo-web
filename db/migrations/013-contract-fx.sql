-- Nilai kontrak campuran mata uang (IDR + USD + CNY + CNH) dan kurs bulanan ke Rupiah.
-- Kurs diambil otomatis dari api.frankfurter.dev (utamakan penyedia Bank Indonesia), disimpan per bulan
-- supaya laporan bulan lalu tetap memakai kurs bulan itu.
create table if not exists fx_rates (
  month text primary key,              -- 'YYYY-MM'
  usd numeric,                          -- Rp per 1 USD
  cny numeric,                          -- Rp per 1 CNY
  cnh numeric,                          -- Rp per 1 CNH
  rate_date date,                       -- tanggal kurs yang dipakai
  source jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);
-- Riwayat komponen kontrak: kind = 'BASE' (dari Tambah/Edit Proyek) atau 'ADD' (setelah addendum).
create table if not exists contract_fx (
  id bigserial primary key,
  project_id text not null,
  kind text not null default 'BASE',
  idr numeric not null default 0,
  usd numeric not null default 0,
  cny numeric not null default 0,
  cnh numeric not null default 0,
  note text not null default '',
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists contract_fx_project_idx on contract_fx (project_id, id desc);
