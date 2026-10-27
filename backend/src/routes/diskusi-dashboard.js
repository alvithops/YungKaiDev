// Diskusi per kelas (thread + balasan via parent_id) + dashboard ringkas.
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { catatAktivitas } = require('../utils/notifikasi');

const diskusi = express.Router();
const dash = express.Router();
const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message, data: null });

function cekKelas(kelasId, user) {
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kelasId);
  if (!kelas) return { err: 'Kelas tidak ditemukan', code: 404 };
  const anggota = db.prepare('SELECT id FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelasId, user.id);
  if (kelas.mentor_id !== user.id && !anggota) return { err: 'Bukan anggota kelas ini', code: 403 };
  return { kelas };
}

// GET /api/kelas/:id/diskusi?materi_id=
diskusi.get('/kelas/:id/diskusi', verifyToken, (req, res) => {
  const { err, code } = cekKelas(req.params.id, req.user);
  if (err) return fail(res, err, code);
  let rows;
  if (req.query.materi_id) {
    rows = db.prepare(`SELECT d.*, u.nama AS penulis, u.role AS penulis_role FROM diskusi d JOIN users u ON u.id = d.user_id WHERE d.kelas_id = ? AND d.materi_id = ? ORDER BY d.id`).all(req.params.id, req.query.materi_id);
  } else {
    rows = db.prepare(`SELECT d.*, u.nama AS penulis, u.role AS penulis_role FROM diskusi d JOIN users u ON u.id = d.user_id WHERE d.kelas_id = ? ORDER BY d.id`).all(req.params.id);
  }
  // susun tree sederhana: parent + children
  const map = {};
  rows.forEach((r) => { map[r.id] = { ...r, balasan: [] }; });
  const roots = [];
  rows.forEach((r) => {
    if (r.parent_id && map[r.parent_id]) map[r.parent_id].balasan.push(map[r.id]);
    else roots.push(map[r.id]);
  });
  return ok(res, roots);
});

// POST /api/kelas/:id/diskusi {isi, materi_id?, parent_id?}
diskusi.post('/kelas/:id/diskusi', verifyToken, (req, res) => {
  const { err, code, kelas } = cekKelas(req.params.id, req.user);
  if (err) return fail(res, err, code);
  if (req.user.role === 'siswa') {
    const st = db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelas.id, req.user.id);
    if (!st || st.status !== 'aktif') return fail(res, 'Kamu sedang keluar kelas. Masuk kembali untuk berdiskusi.', 403);
  }
  const { isi, materi_id, parent_id } = req.body || {};
  if (!isi || !String(isi).trim()) return fail(res, 'Isi diskusi wajib diisi');
  const info = db.prepare('INSERT INTO diskusi (kelas_id, materi_id, user_id, parent_id, isi) VALUES (?,?,?,?,?)')
    .run(kelas.id, materi_id || null, req.user.id, parent_id || null, String(isi).trim());
  const row = db.prepare(`SELECT d.*, u.nama AS penulis, u.role AS penulis_role FROM diskusi d JOIN users u ON u.id = d.user_id WHERE d.id = ?`).get(info.lastInsertRowid);
  catatAktivitas(req.user.id, 'diskusi');
  return ok(res, row, 'Pesan terkirim', 201);
});

// DELETE /api/kelas/:id/diskusi (mentor pemilik) — hapus SELURUH chat kelas.
// Satu tabel dipakai berdua → otomatis hilang juga di halaman siswa (sync via polling/BroadcastChannel).
diskusi.delete('/kelas/:id/diskusi', verifyToken, requireRole('mentor'), (req, res) => {
  const { err, code, kelas } = cekKelas(req.params.id, req.user);
  if (err) return fail(res, err, code);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const sebelum = db.prepare('SELECT COUNT(*) c FROM diskusi WHERE kelas_id = ?').get(kelas.id).c;
  db.prepare('DELETE FROM diskusi WHERE kelas_id = ?').run(kelas.id);
  const sesudah = db.prepare('SELECT COUNT(*) c FROM diskusi WHERE kelas_id = ?').get(kelas.id).c;
  const dihapus = sebelum - sesudah;
  return ok(res, { dihapus }, `Seluruh chat dihapus (${dihapus} pesan)`);
});
diskusi.delete('/diskusi/:diskusiId', verifyToken, (req, res) => {
  const d = db.prepare('SELECT * FROM diskusi WHERE id = ?').get(req.params.diskusiId);
  if (!d) return fail(res, 'Diskusi tidak ditemukan', 404);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(d.kelas_id);
  if (d.user_id !== req.user.id && kelas.mentor_id !== req.user.id) return fail(res, 'Hanya penulis / mentor yang bisa hapus', 403);
  db.prepare('DELETE FROM diskusi WHERE id = ?').run(d.id);
  return ok(res, null, 'Diskusi dihapus');
});

// ---- Dashboard ----
// GET /api/dashboard/mentor
dash.get('/mentor', verifyToken, requireRole('mentor'), (req, res) => {
  const total_kelas = db.prepare('SELECT COUNT(*) c FROM kelas WHERE mentor_id = ?').get(req.user.id).c;
  // total siswa = SEMUA yang sudah daftar (auth_register), bukan cuma anggota kelasku
  const total_siswa = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'siswa'").get().c;
  const tugas_belum_dinilai = db.prepare(`SELECT COUNT(*) c FROM pengumpulan_tugas p JOIN tugas t ON t.id = p.tugas_id JOIN kelas k ON k.id = t.kelas_id WHERE k.mentor_id = ? AND p.status = 'terkumpul'`).get(req.user.id).c;
  const kuis_aktif = db.prepare('SELECT COUNT(*) c FROM kuis q JOIN kelas k ON k.id = q.kelas_id WHERE k.mentor_id = ? AND (q.deadline IS NULL OR q.deadline > CURRENT_TIMESTAMP)').get(req.user.id).c;
  // online = siswa terdaftar yang sedang membuka website (< 5 menit terakhir)
  const online = db.prepare(`SELECT COUNT(*) c FROM users WHERE role = 'siswa' AND last_seen >= datetime('now', '-5 minutes')`).get().c;
  return ok(res, { total_kelas, total_siswa, tugas_belum_dinilai, kuis_aktif, online });
});

// GET /api/dashboard/siswa
dash.get('/siswa', verifyToken, requireRole('siswa'), (req, res) => {
  const total_kelas = db.prepare('SELECT COUNT(*) c FROM kelas_member WHERE siswa_id = ?').get(req.user.id).c;
  const tugas_mendatang = db.prepare(`SELECT t.*, k.nama_kelas FROM tugas t JOIN kelas k ON k.id = t.kelas_id JOIN kelas_member km ON km.kelas_id = k.id WHERE km.siswa_id = ? AND (t.deadline IS NULL OR t.deadline > CURRENT_TIMESTAMP) AND NOT EXISTS (SELECT 1 FROM pengumpulan_tugas p WHERE p.tugas_id = t.id AND p.siswa_id = ?) ORDER BY t.deadline LIMIT 5`).all(req.user.id, req.user.id);
  const nilai_terakhir = db.prepare(`SELECT p.nilai, p.feedback, p.graded_at, t.judul AS tugas_judul, k.nama_kelas FROM pengumpulan_tugas p JOIN tugas t ON t.id = p.tugas_id JOIN kelas k ON k.id = t.kelas_id WHERE p.siswa_id = ? AND p.status = 'dinilai' ORDER BY p.graded_at DESC LIMIT 5`).all(req.user.id);
  return ok(res, { total_kelas, tugas_mendatang, nilai_terakhir });
});

// GET /api/dashboard/mentor/grafik — SISWA MENDAFTAR per hari (14 hari, dari auth_register)
dash.get('/mentor/grafik', verifyToken, requireRole('mentor'), (req, res) => {
  const rows = db.prepare(`
    SELECT substr(created_at, 1, 10) AS tanggal, COUNT(*) AS pendaftar
    FROM users WHERE role = 'siswa' AND created_at >= date('now', '-13 days')
    GROUP BY tanggal ORDER BY tanggal`).all();
  const map = Object.fromEntries(rows.map((r) => [r.tanggal, r.pendaftar]));
  const out = [];
  for (let i = 13; i >= 0; i--) {
    const t = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    out.push({ tanggal: t, pendaftar: map[t] || 0 });
  }
  return ok(res, out);
});

// GET /api/dashboard/mentor/aktivitas — feed + siswa aktif (mengikuti data siswa, live)
dash.get('/mentor/aktivitas', verifyToken, requireRole('mentor'), (req, res) => {
  const feed = db.prepare(`
    SELECT * FROM (
      SELECT 'tugas' AS jenis, p.submitted_at AS waktu, u.nama AS siapa, t.judul AS objek, k.nama_kelas, k.id AS kelas_id, p.status AS extra
      FROM pengumpulan_tugas p JOIN tugas t ON t.id = p.tugas_id JOIN kelas k ON k.id = t.kelas_id JOIN users u ON u.id = p.siswa_id WHERE k.mentor_id = ?
      UNION ALL
      SELECT 'kuis', h.submitted_at, u.nama, q.judul, k.nama_kelas, k.id, ('skor ' || h.skor)
      FROM hasil_kuis h JOIN kuis q ON q.id = h.kuis_id JOIN kelas k ON k.id = q.kelas_id JOIN users u ON u.id = h.siswa_id WHERE k.mentor_id = ?
      UNION ALL
      SELECT 'diskusi', d.created_at, u.nama, substr(d.isi, 1, 60), k.nama_kelas, k.id, NULL
      FROM diskusi d JOIN kelas k ON k.id = d.kelas_id JOIN users u ON u.id = d.user_id WHERE k.mentor_id = ? AND u.role = 'siswa'
      UNION ALL
      SELECT 'gabung', km.joined_at, u.nama, k.nama_kelas, k.nama_kelas, k.id, NULL
      FROM kelas_member km JOIN kelas k ON k.id = km.kelas_id JOIN users u ON u.id = km.siswa_id WHERE k.mentor_id = ?
      UNION ALL
      SELECT 'daftar', u.created_at, u.nama, ('@' || COALESCE(u.username, u.email)), NULL, NULL, NULL
      FROM users u WHERE u.role = 'siswa' AND u.created_at >= datetime('now', '-3 days')
    ) ORDER BY waktu DESC LIMIT 15`).all(req.user.id, req.user.id, req.user.id, req.user.id);
  const aktif = db.prepare(`
    SELECT u.id, u.nama,
      (SELECT COUNT(*) FROM aktivitas a WHERE a.user_id = u.id) AS total,
      u.last_seen AS terakhir,
      CASE WHEN u.last_seen >= datetime('now', '-5 minutes') THEN 1 ELSE 0 END AS online
    FROM users u
    WHERE u.role = 'siswa'
    ORDER BY online DESC, terakhir DESC LIMIT 8`).all();
  return ok(res, { feed, aktif });
});

module.exports = { diskusi, dash };
