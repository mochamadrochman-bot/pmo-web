-- Izin memakai Sena (Asisten PMO / AI) untuk akun selain Admin, misalnya direktur.
alter table users add column if not exists sena_access boolean not null default false;
