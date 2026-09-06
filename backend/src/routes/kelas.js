// Kelas: buat + kode unik, join via kode, anggota, regenerate, keluar, hapus.
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { generateUniqueKode } = require('../utils/kode');

const router = express.Router();
const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message, data: null });

function isMember(kelasId, userId) {
  return !!db.prepare('SELECT id FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelasId, userId);
}
function getKelas(id) {
  return db.prepare(`SELECT k.*, u.nama AS mentor_nama FROM kelas k JOIN users u ON u.id = k.mentor_id WHERE k.id = ?`).get(id);
}

// POST /api/kelas (mentor) — buat kelas + generate kode
router.post('/kelas', verifyToken, requireRole('mentor'), (req, res) => {
  const { nama_kelas, deskripsi } = req.body || {};
  if (!nama_kelas) return fail(res, 'nama_kelas wajib diisi');
  const kode = generateUniqueKode(nama_kelas);
  const info = db.prepare('INSERT INTO kelas (mentor_id, nama_kelas, deskripsi, kode_kelas) VALUES (?,?,?,?)')
    .run(req.user.id, String(nama_kelas).trim(), (deskripsi || '').trim(), kode);
  return ok(res, getKelas(info.lastInsertRowid), 'Kelas dibuat. Bagikan kode ke siswa.', 201);
});

// GET /api/kelas — mentor: yang dibuat; siswa: yang diikuti
router.get('/kelas', verifyToken, (req, res) => {
  if (req.user.role === 'mentor') {
    const rows = db.prepare(`SELECT k.*, COUNT(km.id) AS jml_siswa FROM kelas k LEFT JOIN kelas_member km ON km.kelas_id = k.id WHERE k.mentor_id = ? GROUP BY k.id ORDER BY k.id DESC`).all(req.user.id);
    return ok(res, rows);
  }
  const rows = db.prepare(`SELECT k.*, u.nama AS mentor_nama FROM kelas k JOIN kelas_member km ON km.kelas_id = k.id JOIN users u ON u.id = k.mentor_id WHERE km.siswa_id = ? ORDER BY k.id DESC`).all(req.user.id);
  return ok(res, rows);
});

// POST /api/kelas/join (siswa)
router.post('/kelas/join', verifyToken, requireRole('siswa'), (req, res) => {
  const { kode_kelas } = req.body || {};
  if (!kode_kelas) return fail(res, 'kode_kelas wajib diisi');
  const kode = String(kode_kelas).trim().toUpperCase();
  const kelas = db.prepare('SELECT * FROM kelas WHERE kode_kelas = ?').get(kode);
  if (!kelas) return fail(res, 'Kode tidak ditemukan. Minta kode yang benar dari mentor.', 404);
  const kenaBan = db.prepare('SELECT * FROM banned WHERE kelas_id = ? AND siswa_id = ?').get(kelas.id, req.user.id);
  if (kenaBan) {
    // otomatis catat permintaan akses kembali (seperti referensi: accessRequests)
    db.prepare(`INSERT INTO access_requests (kelas_id, siswa_id) VALUES (?,?)
      ON CONFLICT(kelas_id, siswa_id) DO UPDATE SET status = 'pending', created_at = CURRENT_TIMESTAMP`)
      .run(kelas.id, req.user.id);
    return fail(res, 'Akunmu diblokir dari kelas ini. Permintaan akses kembali sudah dikirim ke mentor.', 403);
  }
  if (isMember(kelas.id, req.user.id)) return fail(res, 'Kamu sudah bergabung di kelas ini', 409);
  db.prepare('INSERT INTO kelas_member (kelas_id, siswa_id) VALUES (?,?)').run(kelas.id, req.user.id);
  return ok(res, getKelas(kelas.id), 'Berhasil gabung kelas');
});

// GET /api/kelas/kelas/:id — detail (mentor pemilik / anggota)
router.get('/kelas/:id', verifyToken, (req, res) => {
  const kelas = getKelas(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (req.user.role === 'siswa' && db.prepare('SELECT id FROM banned WHERE kelas_id = ? AND siswa_id = ?').get(kelas.id, req.user.id)) {
    return fail(res, 'Akunmu diblokir dari kelas ini. Minta akses kembali ke mentor.', 403);
  }
  const boleh = kelas.mentor_id === req.user.id || isMember(kelas.id, req.user.id) || req.user.role === 'mentor';
  if (!boleh) return fail(res, 'Bukan anggota kelas ini', 403);
  const jml = db.prepare('SELECT COUNT(*) c FROM kelas_member WHERE kelas_id = ?').get(kelas.id).c;
  return ok(res, { ...kelas, jml_siswa: jml });
});

// GET /api/kelas/kelas/:id/anggota (mentor pemilik)
router.get('/kelas/:id/anggota', verifyToken, requireRole('mentor'), (req, res) => {
  const kelas = getKelas(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const rows = db.prepare(`SELECT u.id, u.nama, u.email, km.joined_at FROM kelas_member km JOIN users u ON u.id = km.siswa_id WHERE km.kelas_id = ? ORDER BY km.joined_at`).all(kelas.id);
  return ok(res, rows);
});

// POST /api/kelas/kelas/:id/regenerate (mentor pemilik) — kode baru
router.post('/kelas/:id/regenerate', verifyToken, requireRole('mentor'), (req, res) => {
  const kelas = getKelas(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const kode = generateUniqueKode(kelas.nama_kelas);
  db.prepare('UPDATE kelas SET kode_kelas = ? WHERE id = ?').run(kode, kelas.id);
  return ok(res, getKelas(kelas.id), 'Kode kelas diperbarui');
});

// DELETE /api/kelas/kelas/:id/keluar (siswa)
router.delete('/kelas/:id/keluar', verifyToken, requireRole('siswa'), (req, res) => {
  db.prepare('DELETE FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').run(req.params.id, req.user.id);
  return ok(res, null, 'Keluar dari kelas');
});

// DELETE /api/kelas/kelas/:id (mentor pemilik)
router.delete('/kelas/:id', verifyToken, requireRole('mentor'), (req, res) => {
  const kelas = getKelas(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  db.prepare('DELETE FROM kelas WHERE id = ?').run(kelas.id);
  return ok(res, null, 'Kelas dihapus');
});

module.exports = router;
