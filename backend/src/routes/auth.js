// POST /api/auth/register | POST /api/auth/login (lama, kompatibel)
// POST /api/auth/login-siswa (username+password) | POST /api/auth/login-mentor (email+password)
const express = require('express');
const db = require('../config/db');
const keamanan = require('../utils/keamanan');
const { catatAktivitas } = require('../utils/notifikasi');
const { notifySekali } = require('../utils/notifikasi');
const { signToken, verifyToken } = require('../middleware/auth');

const router = express.Router();
const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message, data: null });

function usernameValid(u) {
  return /^[a-z0-9._-]{3,20}$/.test(String(u || '').trim().toLowerCase());
}

// Inti login dipakai semua endpoint: rate-limit + cek password + token + hadir.
function selesaikanLogin(req, res, row, password, labelSalah) {
  // email yang diblokir permanent tidak bisa login lagi (terdaftar atau tidak)
  if (row && db.prepare('SELECT id FROM blokir_permanen WHERE email = ?').get(row.email)) {
    return fail(res, 'Akun ini diblokir permanen dan telah dihapus. Hubungi mentor/admin.', 403);
  }
  const key = keamanan.kunciUpaya(req, (row && row.email) || '?');
  const cek = keamanan.bolehLogin(key);
  if (!cek.boleh) return fail(res, `Terlalu banyak gagal login. Coba lagi dalam ${cek.tunggu} detik.`, 429);
  if (!row || !keamanan.cocokPassword(password, row.password_hash)) {
    keamanan.catatGagal(key);
    return fail(res, labelSalah, 401);
  }
  keamanan.catatSukses(key);
  const user = { id: row.id, nama: row.nama, email: row.email, role: row.role, username: row.username || null, created_at: row.created_at };
  db.prepare('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(user.id); // login = online
  // login PERTAMA → beri tahu semua mentor (login berikutnya tidak, agar tidak spam)
  const sudahPernahLogin = db.prepare("SELECT COUNT(*) c FROM aktivitas WHERE user_id = ? AND jenis = 'login'").get(row.id).c > 0;
  catatAktivitas(user.id, 'login'); // sinkronisasi kontribusi harian
  if (row.role === 'siswa' && !sudahPernahLogin) {
    const semuaMentor = db.prepare("SELECT id FROM users WHERE role = 'mentor'").all();
    for (const m of semuaMentor) {
        notifySekali(m.id, null, '🟢 Siswa login', `${row.nama} (@${row.username || row.email}) masuk ke website.`, `login-pertama:${row.id}:ke-${m.id}`);
    }
  }
  // siswa yang di-ban lalu mencoba login → otomatis jadi permintaan akses di pantau mentor
  if (row.role === 'siswa') {
    const daftarBan = db.prepare(`SELECT b.kelas_id, k.nama_kelas, k.mentor_id FROM banned b JOIN kelas k ON k.id = b.kelas_id WHERE b.siswa_id = ?`).all(row.id);
    for (const b of daftarBan) {
      const sblm = db.prepare('SELECT status FROM access_requests WHERE kelas_id = ? AND siswa_id = ?').get(b.kelas_id, row.id);
      db.prepare(`INSERT INTO access_requests (kelas_id, siswa_id) VALUES (?,?) ON CONFLICT(kelas_id, siswa_id) DO UPDATE SET status = 'pending', created_at = CURRENT_TIMESTAMP`).run(b.kelas_id, row.id);
      if (!sblm || sblm.status !== 'pending') {
        notifySekali(b.mentor_id, b.kelas_id, `🔓 ${row.nama} meminta akses`, `${row.nama} (@${row.username || row.email}) mencoba login dan meminta akses kembali ke ${b.nama_kelas}.`, `minta-akses:${b.kelas_id}:${row.id}:` + new Date().toISOString().slice(0, 10));
      }
    }
  }
  // info banned per-kelas (validasi status banned saat masuk)
  const banned_dari = row.role === 'siswa'
    ? db.prepare(`SELECT k.nama_kelas FROM banned b JOIN kelas k ON k.id = b.kelas_id WHERE b.siswa_id = ?`).all(row.id).map((r) => r.nama_kelas)
    : [];
  return ok(res, { token: signToken(user), user, banned_dari }, 'Login berhasil');
}

router.post('/register', (req, res) => {
  const { nama, email, password, role, username } = req.body || {};
  if (!nama || !email || !password) return fail(res, 'Nama, email, dan password wajib diisi');
  if (!keamanan.emailValid(email)) return fail(res, 'Format email tidak valid');
  if (!keamanan.kuatPassword(password)) return fail(res, 'Password minimal 6 karakter');
  const peran = role === 'mentor' ? 'mentor' : 'siswa';
  const emailNorm = String(email).trim().toLowerCase();
  if (db.prepare('SELECT id FROM blokir_permanen WHERE email = ?').get(emailNorm)) {
    return fail(res, 'Email ini diblokir permanen dan tidak bisa didaftarkan lagi.', 403);
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm)) {
    return fail(res, 'Email sudah terdaftar', 409);
  }
  let uname = username ? String(username).trim().toLowerCase() : null;
  if (peran === 'siswa') {
    if (!uname) return fail(res, 'Username wajib diisi untuk siswa');
    if (!usernameValid(uname)) return fail(res, 'Username 3–20 karakter (huruf/angka/titik/underscore/strip)');
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(uname)) return fail(res, 'Username sudah dipakai', 409);
  } else if (uname) {
    if (!usernameValid(uname)) return fail(res, 'Username 3–20 karakter (huruf/angka/titik/underscore/strip)');
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(uname)) return fail(res, 'Username sudah dipakai', 409);
  }
  const hash = keamanan.hashPassword(password);
  const info = db.prepare('INSERT INTO users (nama, email, password_hash, role, username) VALUES (?,?,?,?,?)')
    .run(String(nama).trim(), emailNorm, hash, peran, uname);
  const user = db.prepare('SELECT id, nama, email, role, username, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
  db.prepare('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(user.id); // daftar = langsung online
  catatAktivitas(user.id, 'daftar');
  if (peran === 'siswa') {
    // beri tahu SEMUA mentor seketika (masuk lonceng + feed dashboard mentor)
    const mentorIds = db.prepare("SELECT id FROM users WHERE role = 'mentor'").all();
    const tambah = db.prepare('INSERT INTO notifikasi (user_id, kelas_id, judul, isi) VALUES (?,?,?,?)');
    for (const m of mentorIds) tambah.run(m.id, null, '🎓 Siswa baru mendaftar', `${String(nama).trim()} (@${uname})`);
  }
  return ok(res, { token: signToken(user), user }, 'Registrasi berhasil', 201);
});

// Login gabungan lama (tetap didukung alat uji) — tanpa batasan peran.
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 'Email dan password wajib diisi');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
  return selesaikanLogin(req, res, row, password, 'Email atau password salah');
});

// Login SISWA: username (boleh juga email) + password. Menolak akun mentor.
router.post('/login-siswa', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return fail(res, 'Username dan password wajib diisi');
  const ident = String(username).trim().toLowerCase();
  if (db.prepare('SELECT id FROM blokir_permanen WHERE email = ? OR username = ?').get(ident, ident)) {
    return fail(res, 'Akun ini diblokir permanen dan telah dihapus. Hubungi mentor/admin.', 403);
  }
  const row = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(ident, ident);
  if (row && row.role !== 'siswa') {
    return fail(res, 'Akun ini terdaftar sebagai mentor. Gunakan halaman Login Mentor.', 403);
  }
  return selesaikanLogin(req, res, row, password, 'Username atau password salah');
});

// Login MENTOR: email + password, eksklusif peran mentor (tanpa registrasi di halamannya).
router.post('/login-mentor', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 'Email dan password wajib diisi');
  if (db.prepare('SELECT id FROM blokir_permanen WHERE email = ?').get(String(email).trim().toLowerCase())) {
    return fail(res, 'Akun ini diblokir permanen dan telah dihapus. Hubungi mentor/admin.', 403);
  }
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
  if (row && row.role !== 'mentor') {
    return fail(res, 'Akun ini terdaftar sebagai siswa. Gunakan halaman Login Siswa.', 403);
  }
  return selesaikanLogin(req, res, row, password, 'Email atau password mentor salah');
});

router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, nama, email, role, username, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return fail(res, 'User tidak ditemukan', 404);
  const banned_dari = user.role === 'siswa'
    ? db.prepare(`SELECT k.nama_kelas FROM banned b JOIN kelas k ON k.id = b.kelas_id WHERE b.siswa_id = ?`).all(user.id).map((r) => r.nama_kelas)
    : [];
  return ok(res, { ...user, banned_dari });
});

module.exports = router;
