-- Catatan pelanggaran Content-Security-Policy (mode lapor saja), diringkas per jenis.
create table if not exists csp_reports (
  directive   text not null,      -- mis. img-src, script-src-elem
  blocked     text not null,      -- asal yang terblokir (origin, 'inline', 'eval', 'data', ...)
  page        text not null,      -- halaman tempat terjadi (path + ?page=)
  sample      text,               -- contoh alamat lengkap (dipotong)
  hits        integer not null default 1,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  primary key (directive, blocked, page)
);
