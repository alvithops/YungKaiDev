// POST /api/auth/register | POST /api/auth/login | GET /api/auth/me
const express = require('express');
const db = require('../config/db');
const keamanan = require('../utils/keamanan');
const { catatAktivitas } = require('../utils/notifikasi');
const { signToken, verifyToken } = require('../middleware/auth');

const router = express.Router();
const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message, data: null });

router.post('/register', (req, res) => {
  const { nama, email, password, role } = req.body || {};
  if (!nama || !email || !password) return fail(res, 'Nama, email, dan password wajib diisi');
  if (!keamanan.emailValid(email)) return fail(res, 'Format email tidak valid');
  if (!keamanan.kuatPassword(password)) return fail(res, 'Password minimal 6 karakter');
  const peran = role === 'mentor' ? 'mentor' : 'siswa';
  const emailNorm = String(email).trim().toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm)) {
    return fail(res, 'Email sudah terdaftar', 409);
  }
  const hash = keamanan.hashPassword(password);
  const info = db.prepare('INSERT INTO users (nama, email, password_hash, role) VALUES (?,?,?,?)')
    .run(String(nama).trim(), emailNorm, hash, peran);
  const user = db.prepare('SELECT id, nama, email, role, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
  return ok(res, { token: signToken(user), user }, 'Registrasi berhasil', 201);
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 'Email dan password wajib diisi');
  const key = keamanan.kunciUpaya(req, email);
  const cek = keamanan.bolehLogin(key);
  if (!cek.boleh) return fail(res, `Terlalu banyak gagal login. Coba lagi dalam ${cek.tunggu} detik.`, 429);
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
  if (!row || !keamanan.cocokPassword(password, row.password_hash)) {
    keamanan.catatGagal(key);
    return fail(res, 'Email atau password salah', 401);
  }
  keamanan.catatSukses(key);
  const user = { id: row.id, nama: row.nama, email: row.email, role: row.role, created_at: row.created_at };
  catatAktivitas(user.id, 'login'); // sinkronisasi kontribusi harian
  // info banned per-kelas (validasi status banned saat masuk)
  const banned_dari = row.role === 'siswa'
    ? db.prepare(`SELECT k.nama_kelas FROM banned b JOIN kelas k ON k.id = b.kelas_id WHERE b.siswa_id = ?`).all(row.id).map((r) => r.nama_kelas)
    : [];
  return ok(res, { token: signToken(user), user, banned_dari }, 'Login berhasil');
});

router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, nama, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return fail(res, 'User tidak ditemukan', 404);
  const banned_dari = user.role === 'siswa'
    ? db.prepare(`SELECT k.nama_kelas FROM banned b JOIN kelas k ON k.id = b.kelas_id WHERE b.siswa_id = ?`).all(user.id).map((r) => r.nama_kelas)
    : [];
  return ok(res, { ...user, banned_dari });
});

module.exports = router;
