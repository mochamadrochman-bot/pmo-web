-- Nilai FS per mata uang (kurs FS tetap) dan realisasi biaya bulanan per mata uang (kurs bulan realisasi).
-- Nilai Rupiah Plant / IDC / PM tetap ditulis ke DATA BULANAN seperti sebelumnya; tabel ini menyimpan rinciannya
-- serta pos tambahan "Biaya lain" (nama bebas) yang tidak punya baris di DATA BULANAN.

-- Satu baris per proyek. items = { plant|idc|pm|other: { idr, usd, cny, cnh } }
create table if not exists fs_fx (
  project_id text primary key,
  rate_date date,                        -- tanggal kurs FS (tetap)
  usd numeric,                           -- Rp per 1 USD pada tanggal kurs FS
  cny numeric,
  cnh numeric,
  rate_source text not null default '',  -- 'BI', 'frankfurter', 'manual', ...
  items jsonb not null default '{}'::jsonb,
  other_name text not null default '',
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Realisasi per proyek, bulan ('YYYY-MM'), dan pos (plant|idc|pm|other).
create table if not exists cost_fx (
  project_id text not null,
  month text not null,
  item text not null,
  idr numeric not null default 0,
  usd numeric not null default 0,
  cny numeric not null default 0,
  cnh numeric not null default 0,
  rate_usd numeric,
  rate_cny numeric,
  rate_cnh numeric,
  total numeric not null default 0,      -- nilai Rupiah (idr + valas × kurs)
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (project_id, month, item)
);
