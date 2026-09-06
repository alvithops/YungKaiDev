// Materi: list + CRUD mentor (upload file opsional) per kelas.
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadMateri } = require('../middleware/upload');
const { notifyKelas } = require('../utils/notifikasi');

const router = express.Router();
const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message, data: null });

function cekAkses(kelasId, user) {
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kelasId);
  if (!kelas) return { err: 'Kelas tidak ditemukan', code: 404 };
  const anggota = db.prepare('SELECT id FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelasId, user.id);
  if (kelas.mentor_id !== user.id && !anggota) return { err: 'Bukan anggota kelas ini', code: 403 };
  return { kelas };
}

// GET /api/kelas/:id/materi
router.get('/kelas/:id/materi', verifyToken, (req, res) => {
  const { err, code } = cekAkses(req.params.id, req.user);
  if (err) return fail(res, err, code);
  const rows = db.prepare('SELECT * FROM materi WHERE kelas_id = ? ORDER BY urutan, id').all(req.params.id);
  return ok(res, rows);
});

// POST /api/kelas/:id/materi (mentor pemilik, multipart: file opsional)
router.post('/kelas/:id/materi', verifyToken, requireRole('mentor'), (req, res) => {
  uploadMateri.single('file')(req, res, (e) => {
    if (e) return fail(res, e.message, 400);
    const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.params.id);
    if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
    if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
    const { judul, deskripsi, link_video, urutan } = req.body || {};
    if (!judul) return fail(res, 'Judul wajib diisi');
    const file_path = req.file ? `/uploads/materi/${req.file.filename}` : null;
    const info = db.prepare('INSERT INTO materi (kelas_id, judul, deskripsi, file_path, link_video, urutan) VALUES (?,?,?,?,?,?)')
      .run(kelas.id, String(judul).trim(), (deskripsi || '').trim(), file_path, (link_video || '').trim() || null, Number(urutan) || 0);
    notifyKelas(kelas.id, `📖 Materi baru: ${String(judul).trim()}`, `Kelas ${kelas.nama_kelas}`);
    return ok(res, db.prepare('SELECT * FROM materi WHERE id = ?').get(info.lastInsertRowid), 'Materi ditambahkan', 201);
  });
});

// PUT /api/materi/materi/:materiId (mentor pemilik kelas)
router.put('/materi/:materiId', verifyToken, requireRole('mentor'), (req, res) => {
  const m = db.prepare('SELECT * FROM materi WHERE id = ?').get(req.params.materiId);
  if (!m) return fail(res, 'Materi tidak ditemukan', 404);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(m.kelas_id);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { judul, deskripsi, link_video, urutan } = req.body || {};
  db.prepare('UPDATE materi SET judul = COALESCE(?, judul), deskripsi = COALESCE(?, deskripsi), link_video = COALESCE(?, link_video), urutan = COALESCE(?, urutan) WHERE id = ?')
    .run(judul ?? null, deskripsi ?? null, link_video ?? null, urutan ?? null, m.id);
  return ok(res, db.prepare('SELECT * FROM materi WHERE id = ?').get(m.id), 'Materi diperbarui');
});

// DELETE /api/materi/materi/:materiId
router.delete('/materi/:materiId', verifyToken, requireRole('mentor'), (req, res) => {
  const m = db.prepare('SELECT * FROM materi WHERE id = ?').get(req.params.materiId);
  if (!m) return fail(res, 'Materi tidak ditemukan', 404);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(m.kelas_id);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  db.prepare('DELETE FROM materi WHERE id = ?').run(m.id);
  if (m.file_path) {
    const fp = path.join(__dirname, '..', '..', String(m.file_path).replace(/^\/+/, ''));
    fs.unlink(fp, () => {});
  }
  return ok(res, null, 'Materi dihapus');
});

module.exports = router;
