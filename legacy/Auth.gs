/**
 * PMO INFRASTRUCTURE DASHBOARD
 * AUTH MODULE - REVISED FOUNDATION
 *
 * Login challenge–response (PBKDF2 dihitung di browser), sesi di CacheService,
 * dan batas percobaan login gagal per username.
 */

const AUTH_CONFIG = {
  USER_SHEET: 'USER ACCESS',
  SESSION_DURATION_SECONDS: 21600, // 6 jam
  MAX_LOGIN_ATTEMPTS: 5,           // gagal berturut-turut per username
  LOCK_SECONDS: 900                // lama penguncian setelah batas tercapai (15 menit)
};

/** Batas percobaan login: dihitung per username (huruf kecil), disimpan di CacheService. */
function authThrottleKey_(username) { return 'PMO_LOGIN_FAIL_' + String(username || '').trim().toLowerCase().slice(0, 100); }
function authThrottleCheck_(username) {
  const n = Number(CacheService.getScriptCache().get(authThrottleKey_(username)) || 0);
  return n >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS ? { success: false, locked: true, message: 'Terlalu banyak percobaan login gagal. Akun dikunci sementara; coba lagi dalam 15 menit, atau minta reset password ke Administrator.' } : null;
}
function authThrottleFail_(username) {
  const c = CacheService.getScriptCache(), k = authThrottleKey_(username), n = Number(c.get(k) || 0) + 1;
  c.put(k, String(n), AUTH_CONFIG.LOCK_SECONDS);
  if (n >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) { console.warn(JSON.stringify({ ev: 'login_locked', user: String(username || '').trim().toLowerCase(), fails: n })); return authThrottleCheck_(username); }
  const left = AUTH_CONFIG.MAX_LOGIN_ATTEMPTS - n;
  return { success: false, message: 'Username atau password salah.' + (left <= 2 ? ' Sisa ' + left + ' kali percobaan sebelum akun dikunci 15 menit.' : '') };
}
function authThrottleClear_(username) { CacheService.getScriptCache().remove(authThrottleKey_(username)); }

/**
 * Mengambil sheet pengguna.
 */
function authGetUserSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(AUTH_CONFIG.USER_SHEET);

  if (!sheet) {
    throw new Error('Sheet USER ACCESS tidak ditemukan.');
  }

  return sheet;
}

/**
 * Memastikan struktur header sesuai.
 */
function authValidateHeaders_(sheet) {
  sheet = sheet || authGetUserSheet_();

  const expectedHeaders = [
    'USERNAME',
    'PASSWORD_HASH',
    'SALT',
    'NAMA',
    'ROLE',
    'PROYEK',
    'STATUS',
    'CREATED_AT',
    'PROYEK_ID'
  ];

  const actualHeaders = sheet
    .getRange(1, 1, 1, expectedHeaders.length)
    .getDisplayValues()[0];

  expectedHeaders.forEach(function(header, index) {
    if (String(actualHeaders[index]).trim() !== header) {
      throw new Error(
        'Header tidak sesuai pada kolom ' + (index + 1) +
        '. Header yang diharapkan: ' + header
      );
    }
  });

  return true;
}

/**
 * Pemeriksaan awal modul autentikasi.
 */
function authCheckSetup() {
  authValidateHeaders_();

  return {
    success: true,
    message: 'Struktur USER ACCESS valid.',
    loginEnabled: false,
    nextStep: 'Implementasi autentikasi dan pengelolaan sesi'
  };
}
/**
 * Membuat hash password menggunakan PBKDF2-HMAC-SHA-256.
 * Digunakan untuk akun pengguna, bukan menyimpan password asli.
 */
function authCreatePasswordHash_(password, salt, iterations) {
  const passwordBytes = Utilities.newBlob(
    String(password)
  ).getBytes();

  const saltBytes = Utilities.newBlob(
    String(salt)
  ).getBytes();

  // PBKDF2 block index = 1, dalam format 32-bit big-endian.
  const blockIndex = [0, 0, 0, 1];
  const initialData = saltBytes.concat(blockIndex);

  let u = Utilities.computeHmacSha256Signature(
    initialData,
    passwordBytes
  );

  const result = u.slice();

  for (let i = 1; i < iterations; i++) {
    u = Utilities.computeHmacSha256Signature(
      u,
      passwordBytes
    );

    for (let j = 0; j < result.length; j++) {
      result[j] = result[j] ^ u[j];
    }
  }

  return result.map(function(byte) {
    return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
  }).join('');
}
/**
 * Membuat Administrator pertama satu kali saja.
 * Kredensial awal dibaca dari Script Properties.
 */
function authCreateFirstAdmin() {
  editorOnly_();
  const lock = pmoLock_('AUTH');
  lock.waitLock(10000);

  try {
    authValidateHeaders_();

    const props = PropertiesService.getScriptProperties();

    const username = String(
      props.getProperty('PMO_INITIAL_ADMIN_USERNAME') || ''
    ).trim();

    const password = String(
      props.getProperty('PMO_INITIAL_ADMIN_PASSWORD') || ''
    );

    const nama = String(
      props.getProperty('PMO_INITIAL_ADMIN_NAME') || ''
    ).trim();

    if (!username || !password || !nama) {
      throw new Error(
        'Lengkapi PMO_INITIAL_ADMIN_USERNAME, ' +
        'PMO_INITIAL_ADMIN_PASSWORD, dan PMO_INITIAL_ADMIN_NAME ' +
        'di Script Properties.'
      );
    }

    if (password.length < 12) {
      throw new Error(
        'Password awal harus memiliki minimal 12 karakter.'
      );
    }

    const sheet = authGetUserSheet_();
    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {
      const existingUsers = sheet
        .getRange(2, 1, lastRow - 1, 1)
        .getDisplayValues()
        .flat()
        .map(function(value) {
          return String(value).trim().toLowerCase();
        });

      if (existingUsers.some(function(value) {
        return value !== '';
      })) {
        throw new Error(
          'Sheet USER ACCESS sudah memiliki data pengguna. ' +
          'Pembuatan Administrator pertama dibatalkan.'
        );
      }
    }

    const salt = Utilities.getUuid() + Utilities.getUuid();

    const passwordHash = authCreatePasswordHash_(
      password,
      salt,
      120000
    );

    sheet.appendRow([
      username,
      passwordHash,
      salt,
      nama,
      'ADMIN',
      'ALL',
      'ACTIVE',
      new Date(),
      'ALL'
    ]);

    // Hapus kredensial awal setelah akun berhasil dibuat.
    props.deleteProperty('PMO_INITIAL_ADMIN_USERNAME');
    props.deleteProperty('PMO_INITIAL_ADMIN_PASSWORD');
    props.deleteProperty('PMO_INITIAL_ADMIN_NAME');

    SpreadsheetApp.flush();

    console.log('Administrator pertama berhasil dibuat.');

    return {
      success: true,
      message: 'Administrator pertama berhasil dibuat.',
      username: username,
      role: 'ADMIN'
    };

  } finally {
    lock.releaseLock();
  }
}
/**
 * Verifikasi password terhadap hash yang tersimpan.
 */
function authVerifyPassword_(password, salt, storedHash) {
  const iterations = 120000;

  const calculatedHash = authCreatePasswordHash_(
    password,
    salt,
    iterations
  );

  if (
    typeof storedHash !== 'string' ||
    storedHash.length !== 64 ||
    !/^[a-f0-9]{64}$/i.test(storedHash)
  ) {
    return false;
  }

  return calculatedHash === storedHash.toLowerCase();
}


/**
 * Membuat sesi login untuk pengguna yang berhasil diverifikasi.
 * Masa berlaku sesi: 6 jam.
 */
function authCreateSession_(user) {
  const token = Utilities.getUuid() + Utilities.getUuid();

  const sessionData = {
    username: user.username,
    name: user.name,
    role: user.role,
    project: user.project,
    projectId: user.projectId || '',
    createdAt: Date.now()
  };

  CacheService.getScriptCache().put(
    'PMO_SESSION_' + token,
    JSON.stringify(sessionData),
    AUTH_CONFIG.SESSION_DURATION_SECONDS
  );

  return token;
}


/**
 * Memvalidasi token sesi.
 * Mengembalikan null jika sesi tidak valid atau kedaluwarsa.
 */
function authGetSession(token) {
  token = String(token || '');

  if (!/^[a-f0-9-]{36}[a-f0-9-]{36}$/i.test(token)) {
    return {
      success: false,
      message: 'Sesi tidak valid atau telah berakhir.'
    };
  }

  const cached = CacheService.getScriptCache().get(
    'PMO_SESSION_' + token
  );

  if (!cached) {
    return {
      success: false,
      message: 'Sesi tidak valid atau telah berakhir.'
    };
  }

  const user = JSON.parse(cached);
  // Password diganti / direset setelah sesi ini dibuat → sesi tidak berlaku lagi.
  const pwAt = Number(CacheService.getScriptCache().get('PMO_PWD_AT_' + String(user.username || '').toLowerCase()) || 0);
  if (pwAt && Number(user.createdAt || 0) < pwAt) {
    CacheService.getScriptCache().remove('PMO_SESSION_' + token);
    return { success: false, message: 'Password akun ini sudah diganti. Silakan login kembali.' };
  }
  // Sesi dari versi lama belum menyimpan PROYEK_ID. Lengkapi sekali agar
  // pengguna yang sudah login tidak perlu keluar sebelum aturan baru berlaku.
  if (!Object.prototype.hasOwnProperty.call(user, 'projectId')) {
    user.projectId = '';
    try {
      const sheet = authGetUserSheet_();
      const lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        const names = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
        const index = names.findIndex(function(row) { return String(row[0] || '').trim().toLowerCase() === String(user.username || '').trim().toLowerCase(); });
        if (index >= 0) user.projectId = String(sheet.getRange(index + 2, 9).getDisplayValue() || '').trim();
      }
    } catch (e) { /* INPUT gagal tertutup bila data proyek tidak tersedia. */ }
    CacheService.getScriptCache().put('PMO_SESSION_' + token, JSON.stringify(user), AUTH_CONFIG.SESSION_DURATION_SECONDS);
  }

  return {
    success: true,
    user: user
  };
}


/**
 * Mengakhiri sesi login.
 */
function authLogout(token) {
  token = String(token || '');

  if (/^[a-f0-9-]{36}[a-f0-9-]{36}$/i.test(token)) {
    CacheService.getScriptCache().remove(
      'PMO_SESSION_' + token
    );
  }

  return {
    success: true,
    message: 'Anda telah logout.'
  };
}

/**
 * Membuat challenge singkat untuk verifikasi login di browser.
 * Hash PBKDF2 dihitung memakai Web Crypto agar Apps Script tidak melakukan 120.000 iterasi.
 */
function authBeginLogin(username) {
  const loginStartedAt = Date.now();
  username = String(username || '').trim();
  if (!username) return { success: false, message: 'Username dan password wajib diisi.' };
  const locked = authThrottleCheck_(username);
  if (locked) return locked;

  const sheet = authGetUserSheet_();
  authValidateHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, message: 'Akun pengguna belum tersedia.' };

  const usernames = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  const target = username.toLowerCase();
  let rowNumber = 0;
  for (let i = 0; i < usernames.length; i++) {
    if (String(usernames[i][0] || '').trim().toLowerCase() === target) { rowNumber = i + 2; break; }
  }
  if (!rowNumber) return { success: false, message: 'Username atau password salah.' };

  const row = sheet.getRange(rowNumber, 1, 1, 9).getDisplayValues()[0];
  const savedHash = String(row[1] || '').trim();
  const salt = String(row[2] || '');
  const status = String(row[6] || '').trim().toUpperCase();
  if (status !== 'ACTIVE') return { success: false, message: 'Akun tidak aktif.' };
  const hashAlgorithm = /^[a-f0-9]{64}$/i.test(savedHash) ? 'PBKDF2_SHA256' : /^[A-Za-z0-9+/]{43}=$/.test(savedHash) ? 'SHA256_LEGACY' : '';
  if (!hashAlgorithm || !salt) {
    return { success: false, message: 'Data autentikasi akun tidak valid.' };
  }

  const challengeId = Utilities.getUuid();
  const nonce = Utilities.getUuid() + Utilities.getUuid();
  const challenge = {
    username: String(row[0] || '').trim(),
    nonce: nonce,
    storedHash: savedHash,
    hashAlgorithm: hashAlgorithm,
    user: { username: String(row[0] || '').trim(), name: String(row[3] || ''), role: String(row[4] || '').trim().toUpperCase(), project: String(row[5] || '').trim(), projectId: String(row[8] || '').trim() }
  };
  CacheService.getScriptCache().put('PMO_LOGIN_CHALLENGE_' + challengeId, JSON.stringify(challenge), 90);
  console.log('PMO login prepare ms: '+(Date.now()-loginStartedAt));
  return { success: true, challengeId: challengeId, nonce: nonce, salt: salt, algorithm: hashAlgorithm, iterations: 120000 };
}

/** Memeriksa bukti HMAC dari browser; challenge hanya dapat dipakai sekali. */
function authCompleteLogin(username, challengeId, proof) {
  const loginStartedAt = Date.now();
  username = String(username || '').trim();
  challengeId = String(challengeId || '');
  proof = String(proof || '').toLowerCase();
  const locked = authThrottleCheck_(username);
  if (locked) return locked;
  if (!/^[a-f0-9-]{36}$/.test(challengeId) || !/^[a-f0-9]{64}$/.test(proof)) {
    return { success: false, message: 'Username atau password salah.' };
  }
  const cache = CacheService.getScriptCache();
  const key = 'PMO_LOGIN_CHALLENGE_' + challengeId;
  const cached = cache.get(key);
  cache.remove(key);
  if (!cached) return { success: false, message: 'Sesi verifikasi berakhir. Silakan coba lagi.' };

  const challenge = JSON.parse(cached);
  if (challenge.username.toLowerCase() !== username.toLowerCase()) {
    return authThrottleFail_(username);
  }
  const keyBytes = challenge.hashAlgorithm === 'SHA256_LEGACY'
    ? Utilities.base64Decode(challenge.storedHash)
    : challenge.storedHash.match(/.{2}/g).map(function(pair) {
        const value = parseInt(pair, 16);
        return value > 127 ? value - 256 : value;
      });
  const expected = Utilities.computeHmacSha256Signature(Utilities.newBlob(challenge.nonce).getBytes(), keyBytes).map(function(byte) {
    return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
  }).join('');
  let diff = expected.length ^ proof.length;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (proof.charCodeAt(i) || 0);
  if (diff !== 0) return authThrottleFail_(username);

  authThrottleClear_(username);
  const token = authCreateSession_(challenge.user);
  console.log('PMO login complete ms: '+(Date.now()-loginStartedAt));
  return { success: true, message: 'Login berhasil.', token: token, user: challenge.user };
}


/** Katalog registrasi ringan: hanya empat kolom identitas, tanpa data progres/biaya. */
function authSignupProjects() { return authSignupProjects_(false); }
/** Pilihan pendaftaran ALL: semua tim & semua proyek, hanya untuk role USER (lihat saja). */
function authAllProject_() { return { id: 'ALL', team: 'ALL', name: 'Semua proyek' }; }
function authSignupProjects_(fresh) {
  const cache=CacheService.getScriptCache(),key='PMO_SIGNUP_PROJECTS_V2';
  if(!fresh){const raw=cache.get(key);if(raw){try{return JSON.parse(raw);}catch(e){}}}
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID),map={},list=[];
  [DB_SHEETS.WEEKLY,DB_SHEETS.MONTHLY].forEach(function(name){
    const sh=ss.getSheetByName(name);if(!sh)throw new Error('Sheet '+name+' tidak ditemukan.');
    const last=sh.getLastRow();if(!last)return;
    const rows=sh.getRange(1,1,last,4).getDisplayValues();
    const head=rows.slice(0,30).findIndex(function(r){return normKey_(r[0])==='PROYEK_ID';});
    if(head<0)throw new Error('Header PROYEK_ID tidak ditemukan di '+name+'.');
    rows.slice(head+1).forEach(function(r){
      const id=normKey_(r[0]);if(!id||!String(r[3]||'').trim())return;
      if(!map[id]){map[id]={id:id,team:String(r[1]||'').trim(),name:cleanProjectName_(r[2]||id)};list.push(map[id]);}
      else {if(!map[id].team)map[id].team=String(r[1]||'').trim();if(map[id].name===id&&r[2])map[id].name=cleanProjectName_(r[2]);}
    });
  });
  const out=list.filter(function(p){return p.id&&p.team;});cache.put(key,JSON.stringify(out),300);return out;
}

/** Formulir lama harus dimuat ulang agar tidak menghitung PBKDF2 manual di Apps Script. */
function authRequestAccount() {
  return {success:false,message:'Formulir pendaftaran sudah diperbarui. Muat ulang halaman, lalu ajukan akun kembali.'};
}

/** Server menerbitkan salt dan mengikat username, jabatan, dan proyek selama lima menit. */
function authBeginSignup(name,username,projectId) {
  const start=Date.now();name=String(name||'').trim();username=String(username||'').trim();projectId=String(projectId||'').trim();
  if(name.length<2||name.length>80||/[\r\n]/.test(name))return {success:false,message:'Jabatan harus berisi 2–80 karakter.'};
  if(!/^[A-Za-z0-9._-]{4,32}$/.test(username))return {success:false,message:'Username harus berisi 4–32 huruf, angka, titik, garis bawah, atau tanda hubung.'};
  const project=projectId==='ALL'?authAllProject_():authSignupProjects_(false).find(function(p){return p.id===projectId;});
  if(!project)return {success:false,message:'Pilih tim dan proyek yang tersedia.'};
  const sh=authGetUserSheet_();authValidateHeaders_(sh);
  const names=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues():[];
  if(names.some(function(r){return String(r[0]).trim().toLowerCase()===username.toLowerCase();}))return {success:false,message:'Username sudah digunakan atau permintaannya sudah tersimpan. Hubungi admin untuk peninjauan.'};
  const challengeId=Utilities.getUuid(),salt=Utilities.getUuid()+Utilities.getUuid();
  CacheService.getScriptCache().put('PMO_SIGNUP_CHALLENGE_'+challengeId,JSON.stringify({name:name,username:username,projectId:project.id,team:project.team,salt:salt,createdAt:Date.now()}),300);
  console.log('PMO signup prepare ms: '+(Date.now()-start));
  return {success:true,challengeId:challengeId,salt:salt,algorithm:'PBKDF2_SHA256',iterations:120000};
}

/** Menyimpan verifier PBKDF2 yang dihitung Web Crypto; tidak menerima password asli.
 * Kebijakan panjang password diperiksa di browser. Server memeriksa bentuk verifier
 * 256-bit dan challenge terikat; akun selalu PENDING dengan role awal USER.
 */
function authCompleteSignup(challengeId,credential) {
  const start=Date.now();challengeId=String(challengeId||'');credential=credential||{};
  const hash=String(credential.hash||'').toLowerCase(),len=Number(credential.passwordLength);
  if(!/^[a-f0-9-]{36}$/i.test(challengeId)||!/^[a-f0-9]{64}$/.test(hash)||!Number.isInteger(len)||len<12||len>128) return {success:false,message:'Data pendaftaran tidak valid. Periksa password dan muat ulang formulir.'};
  const cache=CacheService.getScriptCache(),key='PMO_SIGNUP_CHALLENGE_'+challengeId,resultKey='PMO_SIGNUP_RESULT_'+challengeId;
  const previous=cache.get(resultKey);if(previous)return JSON.parse(previous);
  const raw=cache.get(key);if(!raw)return {success:false,message:'Sesi pendaftaran berakhir. Silakan ajukan kembali.'};
  const challenge=JSON.parse(raw);
  if(Date.now()-challenge.createdAt>300000)return {success:false,message:'Sesi pendaftaran berakhir. Silakan ajukan kembali.'};
  const project=challenge.projectId==='ALL'?authAllProject_():authSignupProjects_(true).find(function(p){return p.id===challenge.projectId&&p.team===challenge.team;});
  if(!project)return {success:false,message:'Proyek atau tim telah berubah. Muat ulang daftar dan pilih proyek kembali.'};
  const validatedAt=Date.now(),lock=pmoLock_('AUTH');lock.waitLock(10000);
  let result;
  try {
    const saved=cache.get(resultKey);if(saved)return JSON.parse(saved);
    if(!cache.get(key))return {success:false,message:'Sesi pendaftaran sudah diproses. Muat ulang formulir.'};
    const sh=authGetUserSheet_();authValidateHeaders_(sh);
    const names=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues():[];
    if(names.some(function(r){return String(r[0]).trim().toLowerCase()===challenge.username.toLowerCase();}))return {success:false,message:'Username sudah digunakan atau permintaannya sudah tersimpan. Hubungi admin untuk peninjauan.'};
    sh.appendRow([challenge.username,hash,challenge.salt,challenge.name,'USER',project.team,'PENDING',new Date(),project.id]);
    SpreadsheetApp.flush();
    result={success:true,emailSent:false,message:'Permintaan akun sudah tersimpan dengan status PENDING. Menunggu persetujuan admin.'};
    cache.put(resultKey,JSON.stringify(result),300);cache.remove(key);
  } finally {lock.releaseLock();}
  const storedAt=Date.now();
  try {
    authSendPendingNotice_({username:challenge.username,name:challenge.name,team:project.team,projectId:project.id,projectName:project.name});
    result.emailSent=true;result.message='Permintaan akun tersimpan dan email telah dikirim ke admin. Akun menunggu persetujuan.';
  } catch(e) {
    console.error('Email permintaan akun gagal: '+String(e&&e.message||e));
    result.message='Permintaan akun tersimpan dengan status PENDING. Email belum terkirim; admin dapat meninjau di dashboard atau mengirim ulang email. Anda tidak perlu mendaftar ulang.';
  }
  cache.put(resultKey,JSON.stringify(result),300);
  console.log('PMO signup timing ms: '+JSON.stringify({validation:validatedAt-start,waitAndStore:storedAt-validatedAt,email:Date.now()-storedAt,total:Date.now()-start}));
  return result;
}

function authRequireReviewer_(token) {
  const user=requireUser_(token);
  if(String(user.role||'').trim().toUpperCase()!=='ADMIN') throw new Error('Hanya ADMIN yang dapat meninjau permintaan akun.');
  return user;
}

function authPendingAccounts(token) {
  authRequireReviewer_(token);
  const sh=authGetUserSheet_();authValidateHeaders_(sh);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,9).getDisplayValues():[];
  const projects=authSignupProjects();
  return rows.filter(function(r){return String(r[6]).trim().toUpperCase()==='PENDING';}).map(function(r){
    const p=projects.find(function(p){return p.id===String(r[8]).trim();});
    return {username:String(r[0]),name:String(r[3]),team:String(r[5]),projectId:String(r[8]),projectName:p?p.name:(String(r[8]).trim().toUpperCase()==='ALL'?'Semua proyek (lihat saja)':String(r[8])),created:String(r[7])};
  });
}

function authReviewAccount(token,username,role,decision,bidang) {
  const reviewer=authRequireReviewer_(token);username=String(username||'').trim();role=String(role||'').toUpperCase();decision=String(decision||'').toUpperCase();
  if(!/^[A-Za-z0-9._-]{4,32}$/.test(username)||['USER','INPUT','KONTRAKTOR'].indexOf(role)<0||['APPROVE','REJECT'].indexOf(decision)<0) throw new Error('Permintaan peninjauan tidak valid.');
  const fields=role==='KONTRAKTOR'?ktrParseFields_(bidang):[];
  if(decision==='APPROVE'&&role==='KONTRAKTOR'&&!fields.length) throw new Error('Pilih minimal satu bidang EPCC untuk akun kontraktor.');
  const lock=pmoLock_('AUTH');lock.waitLock(10000);
  try {
    const sh=authGetUserSheet_();authValidateHeaders_(sh);
    const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,9).getDisplayValues():[];
    const i=rows.findIndex(function(r){return String(r[0]).trim().toLowerCase()===username.toLowerCase();});
    if(i<0||String(rows[i][6]).trim().toUpperCase()!=='PENDING') throw new Error('Permintaan sudah diproses atau tidak ditemukan. Muat ulang daftar.');
    const isAll=String(rows[i][8]).trim().toUpperCase()==='ALL';
    if(decision==='APPROVE'&&isAll&&role!=='USER') throw new Error('Akun semua proyek (ALL) hanya dapat disetujui sebagai USER (lihat saja, tanpa input).');
    if(decision==='APPROVE'&&!isAll&&!authSignupProjects_(true).some(function(p){return p.id===String(rows[i][8]).trim()&&p.team===String(rows[i][5]).trim();})) throw new Error('Tim atau PROYEK_ID akun tidak valid. Periksa penetapan proyek sebelum menyetujui.');
    sh.getRange(i+2,5,1,3).setValues([[role,rows[i][5],decision==='APPROVE'?'ACTIVE':'REJECTED']]);
    if(decision==='APPROVE'&&role==='KONTRAKTOR')ktrSetFields_(username,normKey_(rows[i][8]),fields,reviewer.username||'');
    SpreadsheetApp.flush();return {success:true};
  } finally {lock.releaseLock();}
}

function authResendPendingNotifications(token,username) {
  authRequireReviewer_(token);username=String(username||'').trim().toLowerCase();
  const rows=authPendingAccounts(token).filter(function(r){return !username||r.username.toLowerCase()===username;});
  if(username&&!rows.length) throw new Error('Akun PENDING tidak ditemukan.');
  let sent=0,failed=0;const errors=[];
  rows.forEach(function(r){try{authSendPendingNotice_(r);sent++;}catch(e){failed++;errors.push(r.username+': '+String(e&&e.message||e));}});
  return {success:true,sent:sent,failed:failed,message:sent+' email permintaan terkirim; '+failed+' belum terkirim.',errors:errors};
}

/** Link email membuka peninjauan setelah login ADMIN; membuka link tidak mengaktifkan akun. */
function authSendPendingNotice_(r) {
  const esc=function(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  const props=PropertiesService.getScriptProperties(),key='PMO_ACCOUNT_NOTICE_'+String(r.username).toLowerCase();
  const last=Number(props.getProperty(key)||0);
  if(Date.now()-last<60000) throw new Error('Email baru dikirim. Tunggu satu menit sebelum mengirim ulang.');
  if(MailApp.getRemainingDailyQuota()<2) throw new Error('Kuota penerima email hari ini tidak mencukupi.');
  const url=ScriptApp.getService().getUrl()+'?page=portal';
  const text='Permintaan akun PMO menunggu persetujuan.\n\nJabatan: '+r.name+'\nUsername: '+r.username+'\nTim: '+r.team+'\nProyek: '+r.projectName+' ('+r.projectId+')\n\nBuka dashboard dan masuk sebagai ADMIN untuk memilih USER atau INPUT, lalu setujui atau tolak:\n'+url+'\n\nAkun tetap PENDING sampai disetujui. Password tidak disertakan dalam email.';
  const html='<div style="font:15px/1.6 Arial,sans-serif;color:#173149;max-width:600px;margin:auto;padding:24px"><h2 style="color:#073b63">Permintaan akun PMO</h2><p>Akun berikut menunggu persetujuan Anda.</p><table style="width:100%;border-collapse:collapse">'+[['Jabatan',r.name],['Username',r.username],['Tim proyek',r.team],['Proyek',r.projectName],['PROYEK_ID',r.projectId],['Status','PENDING']].map(function(x){return '<tr><td style="padding:8px;border-bottom:1px solid #dce5ec;color:#607589">'+esc(x[0])+'</td><td style="padding:8px;border-bottom:1px solid #dce5ec"><b>'+esc(x[1])+'</b></td></tr>';}).join('')+'</table><p style="margin:24px 0"><a href="'+esc(url)+'" style="background:#0f5fa8;color:white;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">Tinjau permintaan akun</a></p><p>Masuk sebagai ADMIN, pilih hak akses USER atau INPUT, lalu setujui atau tolak di dashboard. Akun tetap PENDING sampai disetujui.</p></div>';
  MailApp.sendEmail({to:'mochamad.rochman@gmail.com,mochamad.rochman@petrokimia-gresik.com',subject:'[PMO] Permintaan akun: '+r.username,body:text,htmlBody:html});
  props.setProperty(key,String(Date.now()));
}

/** Pemeriksaan izin email tanpa mengirim pesan. Jalankan sekali dari editor bila otorisasi diperlukan. */
function authCheckEmailSetup() {
  editorOnly_();
  const quota=MailApp.getRemainingDailyQuota();console.log('Izin email tersedia. Sisa kuota penerima hari ini: '+quota);return quota;
}

// ===================== RESET & GANTI PASSWORD =====================
/*
 * Reset lewat admin: pengguna meminta reset (tanpa login) → ADMIN membuat kode sekali pakai (berlaku 24 jam)
 * dan menyampaikannya langsung ke pengguna → pengguna memasukkan kode + password baru di halaman login.
 * Password baru di-hash PBKDF2 di browser (sama seperti pendaftaran); kode disimpan sebagai hash SHA-256.
 * Setelah password berubah, semua sesi lama akun itu tidak berlaku lagi.
 */
const AUTH_RESET = {
  SHEET: 'RESET_PASSWORD',
  HEAD: ['ID', 'USERNAME', 'STATUS', 'DIMINTA_PADA', 'KODE_HASH', 'KODE_SALT', 'BERLAKU_SAMPAI', 'DIBUAT_OLEH', 'DIBUAT_PADA', 'PERCOBAAN', 'DIPAKAI_PADA', 'CATATAN'],
  CODE_HOURS: 24, MAX_TRY: 5,
  ALPHA: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
};
function authResetSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(AUTH_RESET.SHEET);
  if (!sh) {
    sh = ss.insertSheet(AUTH_RESET.SHEET);
    sh.getRange(1, 1, 1, AUTH_RESET.HEAD.length).setValues([AUTH_RESET.HEAD]).setFontWeight('bold').setBackground('#0F2B46').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}
function authResetRows_() {
  const sh = authResetSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, AUTH_RESET.HEAD.length).getValues().map(function(r, i) {
    const d = function(v) { return v instanceof Date ? v.getTime() : (v ? new Date(v).getTime() || 0 : 0); };
    return { row: i + 2, id: String(r[0] || ''), username: String(r[1] || '').trim(), status: String(r[2] || '').trim().toUpperCase(), askedAt: d(r[3]),
      hash: String(r[4] || ''), salt: String(r[5] || ''), until: d(r[6]), by: String(r[7] || ''), issuedAt: d(r[8]), tries: Number(r[9]) || 0, usedAt: d(r[10]), note: String(r[11] || '') };
  }).filter(function(x) { return x.id; });
}
function authResetSet_(row, patch) {
  const sh = authResetSheet_();
  Object.keys(patch).forEach(function(k) { const c = AUTH_RESET.HEAD.indexOf(k); if (c >= 0) sh.getRange(row, c + 1).setValue(patch[k]); });
}
/** Cari akun di USER ACCESS (tanpa membedakan huruf besar/kecil). */
function authFindUser_(username) {
  const sh = authGetUserSheet_(); authValidateHeaders_(sh);
  const n = sh.getLastRow(); if (n < 2) return null;
  const rows = sh.getRange(2, 1, n - 1, 9).getDisplayValues(), t = String(username || '').trim().toLowerCase();
  for (let i = 0; i < rows.length; i++) if (String(rows[i][0]).trim().toLowerCase() === t)
    return { sheet: sh, row: i + 2, username: String(rows[i][0]).trim(), hash: String(rows[i][1] || '').trim(), salt: String(rows[i][2] || ''), name: String(rows[i][3] || ''), role: String(rows[i][4] || '').trim().toUpperCase(), team: String(rows[i][5] || ''), status: String(rows[i][6] || '').trim().toUpperCase(), projectId: String(rows[i][8] || '').trim() };
  return null;
}
function authHex_(bytes) { return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function authCodeHash_(code, salt) { return authHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), Utilities.Charset.UTF_8)); }
function authSafeEq_(a, b) { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0); return d === 0; }
/** Tulis hash + salt baru dan cabut semua sesi lama akun. */
function authWritePassword_(u, hash, salt) {
  u.sheet.getRange(u.row, 2, 1, 2).setNumberFormat('@').setValues([[hash, salt]]);
  SpreadsheetApp.flush();
  CacheService.getScriptCache().put('PMO_PWD_AT_' + u.username.toLowerCase(), String(Date.now()), AUTH_CONFIG.SESSION_DURATION_SECONDS);
  authThrottleClear_(u.username);
}
function authNewSalt_() { return Utilities.getUuid() + Utilities.getUuid(); }
function authCheckCredential_(credential) {
  credential = credential || {};
  const hash = String(credential.hash || '').toLowerCase(), len = Number(credential.passwordLength);
  if (!/^[a-f0-9]{64}$/.test(hash) || !Number.isInteger(len) || len < 12 || len > 128) throw new Error('Password baru harus berisi 12–128 karakter.');
  return hash;
}

/** Halaman login: minta reset password. Jawaban selalu sama agar tidak membocorkan username yang terdaftar. */
function authRequestReset(username) {
  username = String(username || '').trim();
  const generic = { success: true, message: 'Permintaan reset tercatat. Hubungi admin PMO untuk menerima kode reset, lalu pilih "Saya punya kode".' };
  if (!/^[A-Za-z0-9._-]{4,32}$/.test(username)) return { success: false, message: 'Username tidak valid.' };
  const cache = CacheService.getScriptCache(), rk = 'PMO_RESET_REQ_' + username.toLowerCase();
  if (cache.get(rk)) return generic;
  cache.put(rk, '1', 60);
  const u = authFindUser_(username);
  if (!u || u.status !== 'ACTIVE') return generic;
  const lock = pmoLock_('AUTH'); lock.waitLock(10000);
  let created = false;
  try {
    const open = authResetRows_().filter(function(x) { return x.username.toLowerCase() === u.username.toLowerCase() && x.status === 'DIMINTA' && Date.now() - x.askedAt < 86400000; });
    if (!open.length) { authResetSheet_().appendRow(['RST-' + Utilities.getUuid().slice(0, 8).toUpperCase(), u.username, 'DIMINTA', new Date(), '', '', '', '', '', 0, '', '']); created = true; }
  } finally { lock.releaseLock(); }
  if (created) {
    try {
      if (MailApp.getRemainingDailyQuota() >= 2) MailApp.sendEmail({ to: 'mochamad.rochman@gmail.com,mochamad.rochman@petrokimia-gresik.com', subject: '[PMO] Permintaan reset password: ' + u.username,
        body: 'Pengguna ' + u.name + ' (@' + u.username + ', ' + u.role + ', ' + (u.projectId || u.team) + ') meminta reset password.\n\nPastikan identitasnya, lalu buka dashboard sebagai ADMIN → menu akun → Reset password pengguna → Buat kode.\n' + ScriptApp.getService().getUrl() + '?page=portal\n\nKode tidak dikirim lewat email ini.' });
    } catch (e) { console.error('Email reset gagal: ' + (e && e.message || e)); }
  }
  return generic;
}

/** ADMIN: daftar permintaan reset yang masih terbuka + kode aktif. */
function authResetRequests(token) {
  authRequireReviewer_(token);
  const now = Date.now(), users = {};
  try { const sh = authGetUserSheet_(), n = sh.getLastRow(); if (n >= 2) sh.getRange(2, 1, n - 1, 9).getDisplayValues().forEach(function(r) { users[String(r[0]).trim().toLowerCase()] = { name: String(r[3] || ''), role: String(r[4] || '').toUpperCase(), project: String(r[8] || r[5] || '') }; }); } catch (e) {}
  const fmt = function(t) { return t ? Utilities.formatDate(new Date(t), Session.getScriptTimeZone(), 'd MMM yyyy HH:mm') : ''; };
  return { success: true, items: authResetRows_().filter(function(x) { return x.status === 'DIMINTA' || (x.status === 'KODE_DIBUAT' && x.until > now); })
    .sort(function(a, b) { return (b.askedAt || b.issuedAt) - (a.askedAt || a.issuedAt); }).map(function(x) {
      const u = users[x.username.toLowerCase()] || {};
      return { id: x.id, username: x.username, name: u.name || '', role: u.role || '', project: u.project || '', status: x.status, askedAt: fmt(x.askedAt), issuedAt: fmt(x.issuedAt), until: fmt(x.until), by: x.by };
    }) };
}

/** ADMIN: buat kode reset sekali pakai untuk satu akun. Kode hanya ditampilkan sekali. */
function authIssueResetCode(token, username) {
  const admin = authRequireReviewer_(token);
  const u = authFindUser_(username);
  if (!u) throw new Error('Username tidak ditemukan.');
  if (u.status !== 'ACTIVE') throw new Error('Akun @' + u.username + ' tidak aktif (' + u.status + ').');
  let code = '';
  const rnd = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  for (let i = 0; i < 8; i++) code += AUTH_RESET.ALPHA.charAt(parseInt(rnd.substr(i * 4, 4), 16) % AUTH_RESET.ALPHA.length);
  const salt = Utilities.getUuid(), until = new Date(Date.now() + AUTH_RESET.CODE_HOURS * 3600000), now = new Date();
  const lock = pmoLock_('AUTH'); lock.waitLock(10000);
  try {
    const rows = authResetRows_().filter(function(x) { return x.username.toLowerCase() === u.username.toLowerCase() && (x.status === 'DIMINTA' || x.status === 'KODE_DIBUAT'); });
    const req = rows.filter(function(x) { return x.status === 'DIMINTA'; })[0];
    rows.forEach(function(x) { if (x !== req) authResetSet_(x.row, { STATUS: 'DIGANTI', CATATAN: 'Diganti kode baru' }); });
    const patch = { STATUS: 'KODE_DIBUAT', KODE_HASH: authCodeHash_(code, salt), KODE_SALT: salt, BERLAKU_SAMPAI: until, DIBUAT_OLEH: admin.username || '', DIBUAT_PADA: now, PERCOBAAN: 0 };
    if (req) authResetSet_(req.row, patch);
    else authResetSheet_().appendRow(['RST-' + Utilities.getUuid().slice(0, 8).toUpperCase(), u.username, patch.STATUS, '', patch.KODE_HASH, salt, until, patch.DIBUAT_OLEH, now, 0, '', 'Dibuat langsung oleh admin']);
  } finally { lock.releaseLock(); }
  return { success: true, username: u.username, name: u.name, code: code.slice(0, 4) + '-' + code.slice(4), until: Utilities.formatDate(until, Session.getScriptTimeZone(), 'd MMM yyyy HH:mm') };
}

/** ADMIN: batalkan permintaan / kode reset. */
function authCancelReset(token, id) {
  authRequireReviewer_(token);
  const x = authResetRows_().find(function(r) { return r.id === String(id || ''); });
  if (!x) throw new Error('Permintaan tidak ditemukan.');
  authResetSet_(x.row, { STATUS: 'DIBATALKAN', CATATAN: 'Dibatalkan admin' });
  return { success: true };
}

/** Halaman login: periksa kode, lalu siapkan salt baru untuk hash password di browser. */
function authBeginReset(username, code) {
  username = String(username || '').trim(); code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const bad = { success: false, message: 'Username atau kode reset tidak cocok, atau kode sudah tidak berlaku.' };
  if (!username || code.length !== 8) return bad;
  const lock = pmoLock_('AUTH'); lock.waitLock(10000);
  try {
    const now = Date.now();
    const x = authResetRows_().filter(function(r) { return r.username.toLowerCase() === username.toLowerCase() && r.status === 'KODE_DIBUAT'; }).pop();
    if (!x) return bad;
    if (x.until < now) { authResetSet_(x.row, { STATUS: 'KEDALUWARSA' }); return bad; }
    if (!authSafeEq_(authCodeHash_(code, x.salt), x.hash)) {
      const t = x.tries + 1;
      authResetSet_(x.row, t >= AUTH_RESET.MAX_TRY ? { PERCOBAAN: t, STATUS: 'DIBATALKAN', CATATAN: 'Terlalu banyak percobaan salah' } : { PERCOBAAN: t });
      return t >= AUTH_RESET.MAX_TRY ? { success: false, message: 'Kode salah ' + t + ' kali dan sudah dibatalkan. Minta kode baru ke admin.' } : bad;
    }
    const u = authFindUser_(x.username);
    if (!u || u.status !== 'ACTIVE') return bad;
    const challengeId = Utilities.getUuid(), salt = authNewSalt_();
    CacheService.getScriptCache().put('PMO_RESET_CH_' + challengeId, JSON.stringify({ username: u.username, rid: x.id, salt: salt }), 600);
    return { success: true, challengeId: challengeId, salt: salt, algorithm: 'PBKDF2_SHA256', iterations: 120000, name: u.name };
  } finally { lock.releaseLock(); }
}

/** Halaman login: simpan password baru hasil reset. */
function authCompleteReset(challengeId, credential) {
  challengeId = String(challengeId || '');
  if (!/^[a-f0-9-]{36}$/i.test(challengeId)) return { success: false, message: 'Sesi reset tidak valid. Ulangi dari awal.' };
  const cache = CacheService.getScriptCache(), key = 'PMO_RESET_CH_' + challengeId, raw = cache.get(key);
  if (!raw) return { success: false, message: 'Sesi reset berakhir (10 menit). Masukkan kode lagi.' };
  let hash; try { hash = authCheckCredential_(credential); } catch (e) { return { success: false, message: e.message }; }
  const ch = JSON.parse(raw);
  const lock = pmoLock_('AUTH'); lock.waitLock(10000);
  try {
    const x = authResetRows_().find(function(r) { return r.id === ch.rid; });
    if (!x || x.status !== 'KODE_DIBUAT' || x.until < Date.now()) return { success: false, message: 'Kode reset sudah tidak berlaku. Minta kode baru ke admin.' };
    const u = authFindUser_(ch.username);
    if (!u || u.status !== 'ACTIVE') return { success: false, message: 'Akun tidak aktif.' };
    authWritePassword_(u, hash, ch.salt);
    authResetSet_(x.row, { STATUS: 'SELESAI', DIPAKAI_PADA: new Date() });
    cache.remove(key);
    return { success: true, message: 'Password berhasil diganti. Silakan login dengan password baru.' };
  } finally { lock.releaseLock(); }
}

/** Pengguna login: siapkan ganti password (bukti password lama + salt baru). */
function authChangePwBegin(token) {
  const s = authGetSession(token);
  if (!s || !s.success) throw new Error('Sesi tidak valid. Silakan login kembali.');
  const u = authFindUser_(s.user.username);
  if (!u || u.status !== 'ACTIVE') throw new Error('Akun tidak aktif.');
  const algo = /^[a-f0-9]{64}$/i.test(u.hash) ? 'PBKDF2_SHA256' : /^[A-Za-z0-9+/]{43}=$/.test(u.hash) ? 'SHA256_LEGACY' : '';
  if (!algo || !u.salt) throw new Error('Data autentikasi akun tidak valid. Minta reset ke admin.');
  const challengeId = Utilities.getUuid(), nonce = authNewSalt_(), newSalt = authNewSalt_();
  CacheService.getScriptCache().put('PMO_CHPW_' + challengeId, JSON.stringify({ username: u.username, nonce: nonce, stored: u.hash, algo: algo, newSalt: newSalt }), 300);
  return { success: true, challengeId: challengeId, nonce: nonce, salt: u.salt, algorithm: algo, iterations: 120000, newSalt: newSalt };
}

/** Pengguna login: simpan password baru bila bukti password lama benar. Sesi lain akun ini ikut keluar. */
function authChangePwComplete(token, challengeId, proof, credential) {
  const s = authGetSession(token);
  if (!s || !s.success) throw new Error('Sesi tidak valid. Silakan login kembali.');
  challengeId = String(challengeId || ''); proof = String(proof || '').toLowerCase();
  const cache = CacheService.getScriptCache(), key = 'PMO_CHPW_' + challengeId, raw = /^[a-f0-9-]{36}$/i.test(challengeId) ? cache.get(key) : null;
  cache.remove(key);
  if (!raw) return { success: false, message: 'Waktu habis. Coba lagi.' };
  const ch = JSON.parse(raw);
  if (ch.username.toLowerCase() !== String(s.user.username || '').toLowerCase()) return { success: false, message: 'Sesi tidak cocok.' };
  const keyBytes = ch.algo === 'SHA256_LEGACY' ? Utilities.base64Decode(ch.stored) : ch.stored.match(/.{2}/g).map(function(p) { const v = parseInt(p, 16); return v > 127 ? v - 256 : v; });
  const expected = authHex_(Utilities.computeHmacSha256Signature(Utilities.newBlob(ch.nonce).getBytes(), keyBytes));
  if (!/^[a-f0-9]{64}$/.test(proof) || !authSafeEq_(expected, proof)) return { success: false, message: 'Password lama salah.' };
  let hash; try { hash = authCheckCredential_(credential); } catch (e) { return { success: false, message: e.message }; }
  const lock = pmoLock_('AUTH'); lock.waitLock(10000);
  try {
    const u = authFindUser_(ch.username);
    if (!u || u.hash !== ch.stored) return { success: false, message: 'Password akun baru saja berubah. Muat ulang lalu coba lagi.' };
    authWritePassword_(u, hash, ch.newSalt);
  } finally { lock.releaseLock(); }
  // sesi yang sedang dipakai tetap berlaku
  const sess = s.user; sess.createdAt = Date.now() + 1000;
  cache.put('PMO_SESSION_' + token, JSON.stringify(sess), AUTH_CONFIG.SESSION_DURATION_SECONDS);
  return { success: true, message: 'Password berhasil diganti. Perangkat lain yang masih login akan diminta login ulang.' };
}
