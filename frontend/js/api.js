// Wrapper fetch JSON + token. Lempar Error(message) jika success:false.
// - Setiap mutasi (POST/PUT/DELETE) menyiarkan sinyal realtime lintas-tab.
// - GET yang gagal karena offline memakai cache localStorage terakhir.
async function apiFetch(path, { method = 'GET', body = null, form = null } = {}) {
  const headers = {};
  const token = localStorage.getItem('elearning_token');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  let payload;
  if (form) {
    payload = form; // FormData: jangan set Content-Type manual
  } else if (body !== null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const cacheKey = 'pklcache:' + path;
  let res;
  try {
    res = await fetch(API_BASE_URL + path, { method, headers, body: payload });
  } catch {
    if (method === 'GET') {
      try {
        const c = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (c) { toast('📴 Offline — menampilkan data terakhir tersimpan', 'blue'); return c; }
      } catch {}
    }
    throw new Error('Tidak dapat menghubungi server. Periksa koneksi / pastikan backend jalan.');
  }
  if (res.status === 401 && !path.startsWith('/auth/')) {
    // Sesi/token benar-benar bermasalah. Pengecualian: salah password saat
    // login juga 401 — itu harus menampilkan pesan asli server di bawah.
    localStorage.removeItem('elearning_token');
    localStorage.removeItem('elearning_user');
    if (!location.pathname.includes('auth-login')) location.href = 'auth-login.html';
    throw new Error('Sesi habis, silakan login ulang');
  }
  let json = null;
  try { json = await res.json(); } catch { throw new Error('Respon server tidak valid'); }
  if (!json.success) throw new Error(json.message || 'Terjadi kesalahan');
  if (method === 'GET') {
    try { localStorage.setItem(cacheKey, JSON.stringify(json.data)); } catch {} // cache penuh → abaikan
  } else {
    try { window.__siarkan && window.__siarkan(); } catch {} // beri tahu tab lain
  }
  return json.data;
}

function toast(msg, type = 'yellow') {
  let box = document.getElementById('toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    box.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99;display:flex;flex-direction:column;gap:8px;max-width:min(92vw,360px)';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'nb-alert nb-alert-' + type;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
