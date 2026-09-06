// Guard halaman + profil + logout. Dipakai semua halaman app.
// <body data-require="mentor|siswa"> untuk proteksi peran.
async function requireAuth() {
  const token = localStorage.getItem('elearning_token');
  if (!token) { location.href = 'auth-login.html'; throw new Error('redirect'); }
  let user;
  try {
    user = JSON.parse(localStorage.getItem('elearning_user') || 'null');
    user = await apiFetch('/auth/me');
    localStorage.setItem('elearning_user', JSON.stringify(user));
  } catch (e) {
    location.href = 'auth-login.html';
    throw e;
  }
  const need = document.body.dataset.require;
  if (need && user.role !== need) {
    location.href = user.role === 'mentor' ? 'dashboard-mentor.html' : 'dashboard-siswa.html';
    throw new Error('redirect');
  }
  renderProfile(user);
  // Heartbeat: tiap 60 dtk panggil API agar server menandai user sedang online.
  // (Server menulis last_seen max 1x/menit → dipakai penghitung "siswa online".)
  if (!window.__heartbeat) {
    window.__heartbeat = setInterval(() => {
      if (localStorage.getItem('elearning_token')) apiFetch('/auth/me').catch(() => {});
    }, 60000);
  }
  return user;
}

function renderProfile(user) {
  document.querySelectorAll('[data-profile-nama]').forEach((el) => (el.textContent = user.nama));
  document.querySelectorAll('[data-profile-role]').forEach((el) => (el.textContent = user.role.toUpperCase()));
  document.querySelectorAll('[data-profile-avatar]').forEach((el) => (el.textContent = (user.nama || '?')[0].toUpperCase()));
  // Samakan link "Dashboard" di sidebar kelas-detail dengan peran
  const dash = document.querySelector('[data-link-dashboard]');
  if (dash) dash.href = user.role === 'mentor' ? 'dashboard-mentor.html' : 'dashboard-siswa.html';
}

function logout() {
  localStorage.removeItem('elearning_token');
  localStorage.removeItem('elearning_user');
  location.href = 'auth-login.html';
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-logout]')) logout();
});
