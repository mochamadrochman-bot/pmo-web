-- Kaitkan pustaka PDF presentasi ke proyek tertentu (NULL = portofolio/umum oleh Admin),
-- agar akun PIC / Input mengelola materi PDF khusus proyeknya sendiri.
alter table pres_decks add column if not exists project_id text;
create index if not exists pres_decks_project_id_idx on pres_decks (project_id) where ready;
