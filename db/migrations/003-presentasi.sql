-- Pustaka slide presentasi: file PDF yang tiap halamannya disimpan sebagai gambar,
-- plus susunan slide tambahan per halaman presentasi (Executive / Weekly per proyek).
create table if not exists pres_decks (
  id          serial primary key,
  title       text not null,
  file_name   text,
  pages       integer not null default 0,
  ready       boolean not null default false,
  created_by  text,
  created_at  timestamptz not null default now()
);
create table if not exists pres_pages (
  deck_id  integer not null references pres_decks(id) on delete cascade,
  page_no  integer not null,
  width    integer not null,
  height   integer not null,
  thumb    bytea not null,
  image    bytea not null,
  primary key (deck_id, page_no)
);
-- key: 'executive', 'weekly:<NAMA PROYEK>', atau '_settings' (teks sampul & terima kasih)
create table if not exists pres_sets (
  key        text primary key,
  data       jsonb not null default '[]',
  updated_by text,
  updated_at timestamptz not null default now()
);
