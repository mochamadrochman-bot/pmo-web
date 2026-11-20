-- Catat waktu aktivitas terakhir akun untuk menampilkan status Online / Terakhir aktif di Kelola Akun.
alter table users add column if not exists last_seen_at timestamptz;
create index if not exists users_last_seen_idx on users (last_seen_at desc nulls last);
create index if not exists sessions_user_expires_idx on sessions (user_id, expires_at);
