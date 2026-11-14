alter table pres_pages
  add column if not exists image_drive_id text,
  add column if not exists thumb_drive_id text;

alter table pres_pages
  alter column thumb drop not null,
  alter column image drop not null;
