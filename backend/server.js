// E-Learning PKL-Web — REST API + serve frontend statis (1x jalan).
// Mode cluster (multi-core) untuk 1000 siswa: CLUSTER=1 npm start
require('dotenv').config();
const cluster = require('cluster');
const os = require('os');

if ((process.env.CLUSTER === '1' || process.argv.includes('--cluster')) && cluster.isPrimary) {
  const n = Number(process.env.WORKERS) || os.cpus().length;
  console.log(`[cluster] primer ${process.pid}: menjalankan ${n} worker...`);
  for (let i = 0; i < n; i++) cluster.fork();
  cluster.on('exit', (w) => { console.log(`[cluster] worker ${w.process.pid} mati → restart`); cluster.fork(); });
  return;
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const keamanan = require('./src/utils/keamanan');

require('./src/config/db'); // init SQLite + tabel

const app = express();
app.disable('x-powered-by');

// HEADER KEAMANAN (tanpa dependensi eksternal) — di-render sebelum semua respons.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com");
  next();
});

// CORS terbatas: asal sendiri, localhost (dev/LAN), atau daftar CORS_ORIGINS di .env. Lain → ditolak.
const corsOriginBoleh = String(process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
function corsBoleh(origin) {
  if (!origin) return true; // request same-origin (tanpa header Origin)
  if (origin === 'null') return true; // file:// saat pakai Live Server
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  } catch {}
  return corsOriginBoleh.includes(origin);
}
app.use(cors({
  origin: (origin, cb) => corsBoleh(origin) ? cb(null, true) : cb(new Error('Asal permintaan tidak diizinkan (CORS)')),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// UNDUHAN TERKUNCI: /api/file?f=/uploads/...&token=JWT — tanpa token valid + hak akses → ditolak.
// (Folder /uploads TIDAK diserve publik lagi.)
app.get('/api/file', (req, res) => {
  const j = (code, message) => res.status(code).json({ success: false, message, data: null });
  let user;
  try { user = keamanan.cekToken(req.query.token || ''); }
  catch { return j(401, 'Token tidak valid'); }
  const f = String(req.query.f || '');
  if (!f.startsWith('/uploads/') || f.includes('..')) return j(403, 'Akses file ditolak');
  const db = require('./src/config/db');
  if (f.startsWith('/uploads/materi/')) {
    const m = db.prepare('SELECT * FROM materi WHERE file_path = ?').get(f);
    if (!m) return j(404, 'File tidak ditemukan');
    const k = db.prepare('SELECT * FROM kelas WHERE id = ?').get(m.kelas_id);
    const st = user.role === 'siswa' ? db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(k.id, user.id) : null;
    if (k.mentor_id !== user.id && (!st || st.status !== 'aktif')) return j(403, 'Bukan hakmu');
  } else if (f.startsWith('/uploads/tugas/')) {
    const p = db.prepare('SELECT p.*, t.kelas_id FROM pengumpulan_tugas p JOIN tugas t ON t.id = p.tugas_id WHERE p.file_path = ?').get(f);
    if (!p) return j(404, 'File tidak ditemukan');
    const k = db.prepare('SELECT * FROM kelas WHERE id = ?').get(p.kelas_id);
    if (k.mentor_id !== user.id && p.siswa_id !== user.id) return j(403, 'Bukan hakmu');
  } else return j(403, 'Akses file ditolak');
  const abs = path.join(__dirname, String(f).replace(/^\/+/, ''));
  if (!abs.startsWith(path.join(__dirname, 'uploads'))) return j(403, 'Akses file ditolak');
  return res.sendFile(abs, (e) => { if (e && !res.headersSent) j(404, 'File tidak ditemukan'); });
});
// Frontend: http://localhost:3000/
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const { diskusi, dash } = require('./src/routes/diskusi-dashboard');
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api', require('./src/routes/kelas'));
app.use('/api', require('./src/routes/materi'));
app.use('/api', require('./src/routes/tugas'));
app.use('/api', require('./src/routes/kuis'));
app.use('/api', diskusi); // GET+POST /api/kelas/:id/diskusi & DELETE /api/diskusi/:id
app.use('/api', require('./src/routes/ekstra'));
app.use('/api/dashboard', dash);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend PKL-Web jalan', data: { time: new Date().toISOString() } });
});

// fallback error multer/dll → JSON konsisten
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  return res.status(400).json({ success: false, message: err.message || 'Terjadi kesalahan', data: null });
});

const PORT = process.env.PORT || 3000;
// Pemeriksa keterlambatan tugas → lonceng mentor (sekali per kasus, aman multi-worker)
const { cekTugasTelat } = require('./src/utils/cekTelat');
setTimeout(() => { try { const n = cekTugasTelat(); if (n) console.log(`[telat] ${n} notifikasi keterlambatan terkirim`); } catch (e) { console.error('[telat]', e.message); } }, 20000);
setInterval(() => { try { cekTugasTelat(); } catch {} }, Number(process.env.CEK_TELAT_MS) || 5 * 60 * 1000);
app.listen(PORT, () => console.log(`E-Learning jalan di http://localhost:${PORT} (worker ${process.pid})`));
