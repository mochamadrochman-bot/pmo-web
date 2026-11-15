-- Warna tema mode terang per akun: 'blue' | 'sage' | 'mocha'. Kosong = ikut bawaan Admin (gas_props 'SYS:ACCENT').
alter table users add column if not exists ui_accent text;
