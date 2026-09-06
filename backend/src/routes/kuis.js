// Kuis PG + soal + submit jawaban (nilai otomatis) + hasil.
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyKelas } = require('../utils/notifikasi');
const { catatAktivitas } = require('../utils/notifikasi');

const router = express.Router();
const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message, data: null });

function isMember(kelasId, userId) {
  return !!db.prepare('SELECT id FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelasId, userId);
}

// GET /api/kelas/:id/kuis
router.get('/kelas/:id/kuis', verifyToken, (req, res) => {
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id && !isMember(kelas.id, req.user.id)) return fail(res, 'Bukan anggota kelas ini', 403);
  const rows = db.prepare('SELECT k.*, (SELECT COUNT(*) FROM soal s WHERE s.kuis_id = k.id) AS jml_soal FROM kuis k WHERE k.kelas_id = ? ORDER BY k.id DESC').all(kelas.id);
  if (req.user.role === 'siswa') {
    return ok(res, rows.map((k) => ({ ...k, saya: db.prepare('SELECT skor, submitted_at FROM hasil_kuis WHERE kuis_id = ? AND siswa_id = ?').get(k.id, req.user.id) || null })));
  }
  return ok(res, rows);
});

// POST /api/kelas/:id/kuis (mentor pemilik)
router.post('/kelas/:id/kuis', verifyToken, requireRole('mentor'), (req, res) => {
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { judul, deskripsi, durasi_menit, deadline } = req.body || {};
  if (!judul) return fail(res, 'Judul wajib diisi');
  const info = db.prepare('INSERT INTO kuis (kelas_id, judul, deskripsi, durasi_menit, deadline) VALUES (?,?,?,?,?)')
    .run(kelas.id, String(judul).trim(), (deskripsi || '').trim(), Number(durasi_menit) || 30, deadline || null);
  notifyKelas(kelas.id, `📝 Kuis baru: ${String(judul).trim()}`, `Kelas ${kelas.nama_kelas}`);
  return ok(res, db.prepare('SELECT * FROM kuis WHERE id = ?').get(info.lastInsertRowid), 'Kuis dibuat', 201);
});

// POST /api/kuis/kuis/:kuisId/soal (mentor pemilik kelas)
router.post('/kuis/:kuisId/soal', verifyToken, requireRole('mentor'), (req, res) => {
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(req.params.kuisId);
  if (!kuis) return fail(res, 'Kuis tidak ditemukan', 404);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kuis.kelas_id);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, kunci } = req.body || {};
  if (!pertanyaan || !opsi_a || !opsi_b || !opsi_c || !opsi_d) return fail(res, 'Pertanyaan + 4 opsi wajib diisi');
  const k = String(kunci || 'A').toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(k)) return fail(res, 'Kunci harus A/B/C/D');
  const info = db.prepare('INSERT INTO soal (kuis_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, kunci) VALUES (?,?,?,?,?,?,?)')
    .run(pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, k);
  return ok(res, db.prepare('SELECT * FROM soal WHERE id = ?').get(info.lastInsertRowid), 'Soal ditambahkan', 201);
});

// PUT / DELETE soal
router.put('/kuis/soal/:soalId', verifyToken, requireRole('mentor'), (req, res) => {
  const s = db.prepare('SELECT * FROM soal WHERE id = ?').get(req.params.soalId);
  if (!s) return fail(res, 'Soal tidak ditemukan', 404);
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(s.kuis_id);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kuis.kelas_id);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, kunci } = req.body || {};
  db.prepare('UPDATE soal SET pertanyaan=COALESCE(?,pertanyaan), opsi_a=COALESCE(?,opsi_a), opsi_b=COALESCE(?,opsi_b), opsi_c=COALESCE(?,opsi_c), opsi_d=COALESCE(?,opsi_d), kunci=COALESCE(?,kunci) WHERE id=?')
    .run(pertanyaan ?? null, opsi_a ?? null, opsi_b ?? null, opsi_c ?? null, opsi_d ?? null, kunci ? String(kunci).toUpperCase() : null, s.id);
  return ok(res, db.prepare('SELECT * FROM soal WHERE id = ?').get(s.id), 'Soal diperbarui');
});
router.delete('/kuis/soal/:soalId', verifyToken, requireRole('mentor'), (req, res) => {
  const s = db.prepare('SELECT * FROM soal WHERE id = ?').get(req.params.soalId);
  if (!s) return fail(res, 'Soal tidak ditemukan', 404);
  db.prepare('DELETE FROM soal WHERE id = ?').run(s.id);
  return ok(res, null, 'Soal dihapus');
});

// GET /api/kuis/kuis/:kuisId/soal — siswa: tanpa kunci; mentor: dengan kunci
router.get('/kuis/:kuisId/soal', verifyToken, (req, res) => {
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(req.params.kuisId);
  if (!kuis) return fail(res, 'Kuis tidak ditemukan', 404);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kuis.kelas_id);
  const anggota = isMember(kelas.id, req.user.id);
  if (kelas.mentor_id !== req.user.id && !anggota) return fail(res, 'Bukan anggota kelas ini', 403);
  const rows = db.prepare('SELECT * FROM soal WHERE kuis_id = ? ORDER BY id').all(kuis.id);
  if (req.user.role === 'siswa') return ok(res, rows.map(({ kunci, ...s }) => s));
  return ok(res, rows);
});

// POST /api/kuis/kuis/:kuisId/submit (siswa, 1x percobaan)
router.post('/kuis/:kuisId/submit', verifyToken, requireRole('siswa'), (req, res) => {
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(req.params.kuisId);
  if (!kuis) return fail(res, 'Kuis tidak ditemukan', 404);
  if (!isMember(kuis.kelas_id, req.user.id)) return fail(res, 'Bukan anggota kelas ini', 403);
  if (kuis.deadline && new Date(kuis.deadline) < new Date()) return fail(res, 'Deadline kuis sudah lewat', 400);
  if (db.prepare('SELECT id FROM hasil_kuis WHERE kuis_id = ? AND siswa_id = ?').get(kuis.id, req.user.id)) {
    return fail(res, 'Kuis sudah dikerjakan (maks 1 percobaan)', 409);
  }
  const { jawaban } = req.body || {};
  if (!jawaban || typeof jawaban !== 'object') return fail(res, 'Format jawaban: { soalId: "A" }');
  const daftar = db.prepare('SELECT id, kunci FROM soal WHERE kuis_id = ?').all(kuis.id);
  if (!daftar.length) return fail(res, 'Kuis belum punya soal', 400);
  let benar = 0;
  for (const s of daftar) {
    if (String(jawaban[s.id] || '').toUpperCase() === s.kunci) benar++;
  }
  const skor = Math.round((benar / daftar.length) * 100);
  db.prepare('INSERT INTO hasil_kuis (kuis_id, siswa_id, skor, jawaban) VALUES (?,?,?,?)')
    .run(kuis.id, req.user.id, skor, JSON.stringify(jawaban));
  catatAktivitas(req.user.id, 'kuis');
  return ok(res, { skor, benar, total: daftar.length }, 'Kuis dinilai otomatis', 201);
});

// GET /api/kuis/kuis/:kuisId/hasil — mentor: semua; siswa: miliknya
router.get('/kuis/:kuisId/hasil', verifyToken, (req, res) => {
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(req.params.kuisId);
  if (!kuis) return fail(res, 'Kuis tidak ditemukan', 404);
  if (req.user.role === 'mentor') {
    return ok(res, db.prepare(`SELECT h.*, u.nama AS siswa_nama FROM hasil_kuis h JOIN users u ON u.id = h.siswa_id WHERE h.kuis_id = ? ORDER BY h.skor DESC`).all(kuis.id));
  }
  const row = db.prepare('SELECT * FROM hasil_kuis WHERE kuis_id = ? AND siswa_id = ?').get(kuis.id, req.user.id);
  if (!row) return fail(res, 'Belum mengerjakan', 404);
  return ok(res, row);
});

module.exports = router;
