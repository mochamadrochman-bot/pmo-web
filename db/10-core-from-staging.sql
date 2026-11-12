-- Membentuk tabel inti dari skema staging.
-- Aman dijalankan berulang: memakai truncate lalu isi ulang.

create table if not exists project_items (
  id          bigserial primary key,
  project_id  text not null references projects(id) on delete cascade,
  item_key    text not null,
  unique (project_id, item_key)
);

create table if not exists weekly_values (
  project_id  text not null references projects(id) on delete cascade,
  item_key    text not null,
  week_no     smallint not null check (week_no between 0 and 200),
  value_text  text not null,
  primary key (project_id, item_key, week_no)
);

create index if not exists weekly_values_week_idx on weekly_values(project_id, week_no);

begin;

-- 1. Proyek -----------------------------------------------------------------
truncate table weekly_values, project_items, projects cascade;

insert into projects (id, name, status)
select proyek_id,
       min(nama_proyek),
       'aktif'
  from stg.data_mingguan_proyek
 group by proyek_id;

-- 2. Item per proyek --------------------------------------------------------
-- Nama item dinormalisasi seperti normKey_ di Code.js: ENGINEERING_KOMULATIF-REALISASI
-- menjadi ENGINEERING_KOMULATIF_REALISASI. Tanpa ini, seluruh nilai per disiplin
-- akan gagal dibaca karena kode lama mencari bentuk bergaris bawah.
insert into project_items (project_id, item_key)
select distinct proyek_id,
       trim(both '_' from upper(regexp_replace(item_data, '[^A-Za-z0-9]+', '_', 'g')))
  from stg.data_mingguan_proyek;

-- 3. Nilai mingguan: kolom week_0..week_105 menjadi baris -------------------
insert into weekly_values (project_id, item_key, week_no, value_text)
select d.proyek_id,
       trim(both '_' from upper(regexp_replace(d.item_data, '[^A-Za-z0-9]+', '_', 'g'))),
       substring(x.k from 6)::smallint as week_no,
       btrim(x.v) as value_text
  from stg.data_mingguan_proyek d
  cross join lateral jsonb_each_text(
         to_jsonb(d) - 'proyek_id' - 'tim_proyek' - 'nama_proyek' - 'item_data'
       ) as x(k, v)
 where x.k like 'week\_%'
   and btrim(coalesce(x.v, '')) <> '';

commit;

-- 4. Pengguna lama ----------------------------------------------------------
alter table users add column if not exists legacy_role text;
alter table users add column if not exists team text;

alter table users add column if not exists access_migrated boolean not null default false;

insert into users (username, full_name, role, hash, salt, algo, status, legacy_role, team)
select lower(btrim(u.username)),
       coalesce(nullif(btrim(u.nama), ''), u.username),
       -- Cakupan proyek (project_ids) diisi db/migrations/001-auth.sql saat aplikasi
       -- start berikutnya. Sampai itu cakupannya kosong: kontraktor tidak melihat proyek
       -- apa pun dan INPUT/PIC belum bisa mengedit. Restart aplikasi setelah impor.
       case upper(btrim(u.role))
            when 'ADMIN' then 'admin'
            when 'INPUT' then 'input'
            when 'PIC' then 'input'
            when 'KONTRAKTOR' then 'kontraktor'
            else 'viewer'
       end,
       u.password_hash,
       u.salt,
       'PBKDF2_SHA256',
       case when upper(btrim(u.status)) = 'ACTIVE' then 'aktif' else 'nonaktif' end,
       upper(btrim(u.role)),
       u.proyek
  from stg.user_access u
 where coalesce(btrim(u.username), '') <> ''
on conflict (username) do nothing;
