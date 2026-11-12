-- Tahap A: peran, cakupan proyek per akun, kunci sementara, ganti password.
-- Dijalankan otomatis setiap aplikasi start. Semua perintah aman diulang.

-- 1. Peran yang diizinkan --------------------------------------------------
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('admin', 'input', 'kontraktor', 'viewer', 'reviewer'));

-- 2. Kolom baru ------------------------------------------------------------
alter table users add column if not exists legacy_role text;
alter table users add column if not exists team text;
-- Proyek yang boleh diedit (INPUT/PIC) atau dilihat (KONTRAKTOR). '*' = semua proyek.
alter table users add column if not exists project_ids text[] not null default '{}';
alter table users add column if not exists failed_count integer not null default 0;
alter table users add column if not exists locked_until timestamptz;
alter table users add column if not exists must_change_password boolean not null default false;
alter table users add column if not exists password_changed_at timestamptz;
-- Penanda bahwa peran dan cakupan dari sheet USER ACCESS sudah diterjemahkan.
-- Setelah true, perubahan dari halaman Kelola Akun tidak ditimpa lagi.
alter table users add column if not exists access_migrated boolean not null default false;

-- 3. Terjemahkan peran lama (sekali per akun) -------------------------------
update users
   set role = case upper(btrim(legacy_role))
                when 'ADMIN' then 'admin'
                when 'INPUT' then 'input'
                when 'PIC' then 'input'
                when 'KONTRAKTOR' then 'kontraktor'
                else role
              end
 where not access_migrated
   and legacy_role is not null;

-- 4. Terjemahkan kolom PROYEK lama menjadi daftar ID proyek ------------------
-- Kolom lama boleh berisi ID atau nama proyek, dipisah koma / titik koma / garis miring.
-- ALL, SEMUA, atau * berarti semua proyek.
update users u
   set project_ids = case
         when upper(btrim(coalesce(u.team, ''))) in ('ALL', 'SEMUA', '*') then array['*']
         else coalesce((
           select array_agg(distinct p.id order by p.id)
             from regexp_split_to_table(coalesce(u.team, ''), '\s*[,;/|]\s*') as t(tok)
             join projects p
               on upper(p.id) = upper(btrim(t.tok))
               or upper(p.name) = upper(btrim(t.tok))
            where btrim(t.tok) <> ''
         ), '{}')
       end
 where not u.access_migrated;

update users set access_migrated = true where not access_migrated;

create index if not exists users_role_idx on users(role);
