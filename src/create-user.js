'use strict';

/**
 * Membuat atau mengatur ulang satu akun.
 *
 * Pakai di dalam container:
 *   node src/create-user.js <username> <password> [peran] [nama]
 *
 * Peran: admin, input, reviewer, viewer.
 */

const argon2 = require('@node-rs/argon2');
const db = require('./db');

async function run(username, password, role, fullName) {
  if (!username || !password) {
    console.error('Pakai: node src/create-user.js <username> <password> [peran] [nama]');
    process.exit(1);
  }
  const peran = role || 'admin';
  const nama = fullName || 'Administrator';

  const hash = await argon2.hash(password);
  await db.query(
    `insert into users (username, full_name, role, hash, algo)
     values ($1, $2, $3, $4, 'argon2id')
     on conflict (username) do update
        set hash = excluded.hash, algo = 'argon2id', salt = null,
            role = excluded.role, full_name = excluded.full_name, status = 'aktif'`,
    [username, nama, peran, hash]
  );
  console.log('Akun siap. Username:', username, '| Peran:', peran);
  await db.close();
}

if (require.main === module) {
  run(process.argv[2], process.argv[3], process.argv[4], process.argv[5])
    .catch((err) => {
      console.error('Gagal:', err.message || err);
      process.exit(1);
    });
}

module.exports = { run };
