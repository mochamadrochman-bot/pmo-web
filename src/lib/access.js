'use strict';

/**
 * Satu tempat untuk aturan "siapa boleh apa". Semua rute memanggil fungsi di sini;
 * tampilan hanya menyembunyikan tombol, pemeriksaan sebenarnya selalu di server.
 *
 * | Peran       | Lihat proyek              | Edit proyek                 | Modul            |
 * |-------------|---------------------------|-----------------------------|------------------|
 * | admin       | semua                     | semua                       | semua + akun     |
 * | input (PIC) | semua                     | hanya project_ids           | semua kecuali akun |
 * | kontraktor  | hanya project_ids         | hanya project_ids, EPCC     | portal + epcc    |
 * | viewer      | semua                     | tidak ada                   | semua kecuali akun |
 */

const ALL = '*';

const ROLES = ['admin', 'input', 'kontraktor', 'viewer'];
const ROLE_LABEL = {
  admin: 'Admin',
  input: 'Input / PIC',
  kontraktor: 'Kontraktor',
  viewer: 'Viewer',
  reviewer: 'Reviewer',
};

// Modul yang dipakai rute. Tambahkan di sini saat modul baru dipindahkan.
const MODULES = ['portal', 'dashboard', 'input', 'epcc', 'laporan', 'library', 'akun'];
const KONTRAKTOR_MODULES = ['portal', 'epcc'];

function scope(user) {
  return user && Array.isArray(user.project_ids) ? user.project_ids : [];
}

function inScope(user, projectId) {
  const s = scope(user);
  return s.includes(ALL) || s.includes(String(projectId));
}

function canUseModule(user, module) {
  if (!user) return false;
  if (module === 'akun') return user.role === 'admin';
  if (user.role === 'kontraktor') return KONTRAKTOR_MODULES.includes(module);
  return true;
}

function canViewProject(user, projectId) {
  if (!user) return false;
  if (user.role === 'kontraktor') return inScope(user, projectId);
  return true;
}

/** module: modul tempat data diedit, misalnya 'input' atau 'epcc'. */
function canEditProject(user, projectId, module) {
  if (!user) return false;
  if (module && !canUseModule(user, module)) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'input' || user.role === 'kontraktor') return inScope(user, projectId);
  return false;
}

function visibleProjects(user, projects) {
  return projects.filter((p) => canViewProject(user, p.id));
}

module.exports = {
  ALL, ROLES, ROLE_LABEL, MODULES,
  canUseModule, canViewProject, canEditProject, visibleProjects, inScope,
};
