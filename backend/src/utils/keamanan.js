// ============================================================
// KEAMANAN LOGIN — satu file terpusat (dipakai auth + middleware).
// - Password SELALU di-hash bcrypt (tidak pernah plaintext di DB).
//   (Catatan: menyimpan password tanpa hash = siapa pun yang membaca
//   database bisa melihat password semua user. Jadi hashing dipertahankan.)
// - Token JWT 7 hari, rate-limit login, validasi & sanitasi input.
// ============================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'ganti-secret-ini-min-16-karakter';
if (!process.env.JWT_SECRET) console.warn('[keamanan] JWT_SECRET belum di .env — pakai bawaan (ganti di produksi!)');

// --- Password: hash saat daftar, cocokkan saat login ---
function hashPassword(pw) {
  return bcrypt.hashSync(String(pw), 10);
}
function cocokPassword(pw, hash) {
  try { return bcrypt.compareSync(String(pw), hash); } catch { return false; }
}
function kuatPassword(pw) {
  return typeof pw === 'string' && pw.length >= 6;
}

// --- Token JWT ---
function buatToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
}
function cekToken(token) {
  return jwt.verify(token, SECRET); // lempar error jika palsu/kedaluwarsa
}

// --- Sanitasi teks bebas (cegah XSS tersimpan) ---
function bersih(teks, maks = 500) {
  return String(teks ?? '').replace(/[<>"']/g, '').trim().slice(0, maks);
}
function emailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

// --- Rate-limit login: max 5x gagal / 15 menit per IP+email ---
const upaya = new Map(); // key -> { gagal, hingga }
function kunciUpaya(req, email) {
  return `${req.ip || '?'}:${String(email || '').toLowerCase()}`;
}
function bolehLogin(key) {
  const r = upaya.get(key);
  if (r && Date.now() < r.hingga) return { boleh: false, tunggu: Math.ceil((r.hingga - Date.now()) / 1000) };
  return { boleh: true };
}
function catatGagal(key) {
  const r = upaya.get(key) || { gagal: 0, hingga: 0 };
  r.gagal += 1;
  if (r.gagal >= 5) { r.hingga = Date.now() + 15 * 60 * 1000; r.gagal = 0; }
  upaya.set(key, r);
}
function catatSukses(key) { upaya.delete(key); }

// --- Rate-limit generik per-key (sliding window) untuk register/upload/aksi lain --
const antrian = new Map(); // key -> [timestamp]
function bukaLimit(key, maks, rentangMs) {
  const now = Date.now();
  const arr = (antrian.get(key) || []).filter((t) => now - t < rentangMs);
  if (arr.length >= maks) {
    antrian.set(key, arr);
    return { boleh: false, tunggu: Math.max(1, Math.ceil((rentangMs - (now - arr[0])) / 1000)) };
  }
  arr.push(now);
  antrian.set(key, arr);
  return { boleh: true };
}

module.exports = {
  hashPassword, cocokPassword, kuatPassword,
  buatToken, cekToken, bersih, emailValid,
  kunciUpaya, bolehLogin, catatGagal, catatSukses, bukaLimit,
};
