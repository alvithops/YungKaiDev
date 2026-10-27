// Materi: list + CRUD mentor (upload file opsional) per kelas.
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const keamanan = require('../utils/keamanan');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadMateri } = require('../middleware/upload');
const { notifyKelas } = require('../utils/notifikasi');
const { pagine } = require('../utils/paginasi');

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

// GET /api/kelas/:id/materi — hanya yang sedang MASUK kelas
router.get('/kelas/:id/materi', verifyToken, (req, res) => {
  const { err, code } = cekAkses(req.params.id, req.user);
  if (err) return fail(res, err, code);
  if (req.user.role === 'siswa') {
    const st = db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(req.params.id, req.user.id);
    if (!st || st.status !== 'aktif') return fail(res, 'Masuk kembali ke kelas untuk mengakses modul.', 403);
  }
  const { limit, offset, q } = pagine(req);
  const cari = q ? ' AND (judul LIKE ? OR deskripsi LIKE ?)' : '';
  const args = q ? [req.params.id, `%${q}%`, `%${q}%`] : [req.params.id];
  const total = db.prepare(`SELECT COUNT(*) c FROM materi WHERE kelas_id = ?${cari}`).get(...args).c;
  const rows = db.prepare(`SELECT * FROM materi WHERE kelas_id = ?${cari} ORDER BY urutan, id LIMIT ? OFFSET ?`).all(...args, limit, offset);
  res.set('X-Total-Count', total);
  return ok(res, rows);
});

// POST /api/materi/:materiId/baca (siswa aktif) — jejak modul dibaca untuk progres pantau
router.post('/materi/:materiId/baca', verifyToken, requireRole('siswa'), (req, res) => {
  const m = db.prepare('SELECT * FROM materi WHERE id = ?').get(req.params.materiId);
  if (!m) return fail(res, 'Materi tidak ditemukan', 404);
  const st = db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(m.kelas_id, req.user.id);
  if (!st || st.status !== 'aktif') return fail(res, 'Masuk kembali dulu', 403);
  db.prepare('INSERT INTO aktivitas (user_id, jenis) VALUES (?, ?)').run(req.user.id, `baca:${m.id}`);
  return ok(res, null, 'Tercatat');
});

// POST /api/kelas/:id/materi (mentor pemilik, multipart: file opsional)
router.post('/kelas/:id/materi', verifyToken, requireRole('mentor'), (req, res) => {
  // Batasi upload per mentor (30 upload/15 mnt) untuk cegah spam/banjir file.
  const batas = keamanan.bukaLimit('up:' + req.user.id, 30, 15 * 60 * 1000);
  if (!batas.boleh) return fail(res, `Terlalu banyak upload. Coba lagi dalam ${batas.tunggu} detik.`, 429);
  uploadMateri.single('file')(req, res, (e) => {
    if (e) return fail(res, e.message, 400);
    const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.params.id);
    if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
    if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
    const { judul, deskripsi, link_video, urutan, pertemuan } = req.body || {};
    if (!judul) return fail(res, 'Judul wajib diisi');
    const pert = Math.min(14, Math.max(1, Number(pertemuan) || 1));
    const file_path = req.file ? `/uploads/materi/${req.file.filename}` : null;
    const info = db.prepare('INSERT INTO materi (kelas_id, judul, deskripsi, file_path, link_video, urutan, pertemuan) VALUES (?,?,?,?,?,?,?)')
      .run(kelas.id, String(judul).trim(), (deskripsi || '').trim(), file_path, (link_video || '').trim() || null, Number(urutan) || 0, pert);
    notifyKelas(kelas.id, `📖 Materi baru: ${String(judul).trim()}`, `Kelas ${kelas.nama_kelas}`);
    return ok(res, db.prepare('SELECT * FROM materi WHERE id = ?').get(info.lastInsertRowid), 'Materi ditambahkan', 201);
  });
});

// PUT /api/materi/:materiId (mentor pemilik kelas) — metadata + opsional GANTI file
router.put('/materi/:materiId', verifyToken, requireRole('mentor'), (req, res) => {
  const awal = { ...(req.body || {}) };
  const jalan = () => {
    const m = db.prepare('SELECT * FROM materi WHERE id = ?').get(req.params.materiId);
    if (!m) {
      if (req.file) fs.unlink(path.join(__dirname, '..', '..', 'uploads', 'materi', req.file.filename), () => {});
      return fail(res, 'Materi tidak ditemukan', 404);
    }
    const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(m.kelas_id);
    if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
    const body = { ...awal, ...(req.body || {}) };
    const { judul, deskripsi, link_video, urutan, pertemuan, hapus_file } = body;
    let file_path = m.file_path;
    if (req.file) {
      if (m.file_path) fs.unlink(path.join(__dirname, '..', '..', String(m.file_path).replace(/^\/+/, '')), () => {});
      file_path = `/uploads/materi/${req.file.filename}`;
    } else if (hapus_file === 'true' || hapus_file === true || hapus_file === '1') {
      if (m.file_path) fs.unlink(path.join(__dirname, '..', '..', String(m.file_path).replace(/^\/+/, '')), () => {});
      file_path = null;
    }
    db.prepare('UPDATE materi SET judul = COALESCE(?, judul), deskripsi = COALESCE(?, deskripsi), link_video = COALESCE(?, link_video), urutan = COALESCE(?, urutan), pertemuan = COALESCE(?, pertemuan), file_path = ? WHERE id = ?')
      .run(judul ?? null, deskripsi ?? null, link_video ?? null, urutan ?? null, pertemuan ? Math.min(14, Math.max(1, Number(pertemuan))) : null, file_path, m.id);
    return ok(res, db.prepare('SELECT * FROM materi WHERE id = ?').get(m.id), 'Materi diperbarui');
  };
  if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
    const batas = keamanan.bukaLimit('up:' + req.user.id, 30, 15 * 60 * 1000);
    if (!batas.boleh) return fail(res, `Terlalu banyak upload. Coba lagi dalam ${batas.tunggu} detik.`, 429);
    uploadMateri.single('file')(req, res, (e) => {
      if (e) return fail(res, e.message, 400);
      jalan();
    });
  } else jalan();
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
