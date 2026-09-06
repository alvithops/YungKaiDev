// Tugas + pengumpulan (upload file / submit kode) + penilaian mentor.
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadTugas } = require('../middleware/upload');
const { notifyKelas, notifyUser, catatAktivitas } = require('../utils/notifikasi');

const router = express.Router();
const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message, data: null });

function kelasOf(tugasId) {
  const t = db.prepare('SELECT * FROM tugas WHERE id = ?').get(tugasId);
  if (!t) return {};
  return { tugas: t, kelas: db.prepare('SELECT * FROM kelas WHERE id = ?').get(t.kelas_id) };
}
function isMember(kelasId, userId) {
  return !!db.prepare('SELECT id FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelasId, userId);
}

// GET /api/kelas/:id/tugas — hanya yang sedang MASUK kelas (siswa dapat status kumpul/nilai miliknya)
router.get('/kelas/:id/tugas', verifyToken, (req, res) => {
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id && !isMember(kelas.id, req.user.id)) return fail(res, 'Bukan anggota kelas ini', 403);
  if (req.user.role === 'siswa') {
    const st = db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelas.id, req.user.id);
    if (!st || st.status !== 'aktif') return fail(res, 'Masuk kembali ke kelas untuk mengakses tugas.', 403);
  }
  const rows = db.prepare('SELECT * FROM tugas WHERE kelas_id = ? ORDER BY id DESC').all(kelas.id);
  if (req.user.role === 'siswa') {
    const hasil = rows.map((t) => ({
      ...t,
      saya: db.prepare('SELECT id, tipe, bahasa, nilai, feedback, status, submitted_at FROM pengumpulan_tugas WHERE tugas_id = ? AND siswa_id = ?').get(t.id, req.user.id) || null,
    }));
    return ok(res, hasil);
  }
  const hasil = rows.map((t) => ({
    ...t,
    terkumpul: db.prepare('SELECT COUNT(*) c FROM pengumpulan_tugas WHERE tugas_id = ?').get(t.id).c,
    belum_dinilai: db.prepare("SELECT COUNT(*) c FROM pengumpulan_tugas WHERE tugas_id = ? AND status = 'terkumpul'").get(t.id).c,
  }));
  return ok(res, hasil);
});

// POST /api/kelas/:id/tugas (mentor pemilik)
router.post('/kelas/:id/tugas', verifyToken, requireRole('mentor'), (req, res) => {
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { judul, deskripsi, deadline, pertemuan } = req.body || {};
  if (!judul) return fail(res, 'Judul wajib diisi');
  const pert = Math.min(14, Math.max(1, Number(pertemuan) || 1));
  const info = db.prepare('INSERT INTO tugas (kelas_id, judul, deskripsi, deadline, pertemuan) VALUES (?,?,?,?,?)')
    .run(kelas.id, String(judul).trim(), (deskripsi || '').trim(), deadline || null, pert);
  notifyKelas(kelas.id, `📥 Tugas baru: ${String(judul).trim()}`, `Kelas ${kelas.nama_kelas}${deadline ? ' · deadline ' + deadline : ''}`);
  return ok(res, db.prepare('SELECT * FROM tugas WHERE id = ?').get(info.lastInsertRowid), 'Tugas dibuat', 201);
});

// PUT / DELETE /api/tugas/tugas/:tugasId (mentor pemilik)
router.put('/tugas/:tugasId', verifyToken, requireRole('mentor'), (req, res) => {
  const { tugas, kelas } = kelasOf(req.params.tugasId);
  if (!tugas) return fail(res, 'Tugas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { judul, deskripsi, deadline, pertemuan } = req.body || {};
  db.prepare('UPDATE tugas SET judul = COALESCE(?, judul), deskripsi = COALESCE(?, deskripsi), deadline = COALESCE(?, deadline), pertemuan = COALESCE(?, pertemuan) WHERE id = ?')
    .run(judul ?? null, deskripsi ?? null, deadline ?? null, pertemuan ? Math.min(14, Math.max(1, Number(pertemuan))) : null, tugas.id);
  return ok(res, db.prepare('SELECT * FROM tugas WHERE id = ?').get(tugas.id), 'Tugas diperbarui');
});
router.delete('/tugas/:tugasId', verifyToken, requireRole('mentor'), (req, res) => {
  const { tugas, kelas } = kelasOf(req.params.tugasId);
  if (!tugas) return fail(res, 'Tugas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  db.prepare('DELETE FROM tugas WHERE id = ?').run(tugas.id);
  return ok(res, null, 'Tugas dihapus');
});

// POST /api/tugas/tugas/:tugasId/kumpul (siswa: multipart {file} ATAU JSON {tipe:'code', bahasa, kode_program})
router.post('/tugas/:tugasId/kumpul', verifyToken, requireRole('siswa'), (req, res) => {
  const ctype = req.headers['content-type'] || '';
  if (ctype.includes('multipart/form-data')) {
    uploadTugas.single('file')(req, res, (e) => {
      if (e) return fail(res, e.message, 400);
      if (!req.file) return fail(res, 'File wajib dipilih');
      simpanKumpul(req, res, { tipe: 'file', file_path: `/uploads/tugas/${req.file.filename}` });
    });
  } else {
    const { tipe, bahasa, kode_program } = req.body || {};
    if (tipe !== 'code' || !kode_program) return fail(res, "Mode kode: kirim { tipe:'code', bahasa, kode_program }");
    // simpan juga sebagai file .txt agar ada arsip fisik di folder server
    const fname = `${Date.now()}-${req.user.id}.${(bahasa || 'txt').replace(/[^a-z0-9]/gi, '') || 'txt'}.txt`;
    const dir = path.join(__dirname, '..', '..', 'uploads', 'tugas');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fname), String(kode_program));
    simpanKumpul(req, res, { tipe: 'code', file_path: `/uploads/tugas/${fname}`, bahasa: bahasa || 'txt', kode_program: String(kode_program) });
  }
});

function simpanKumpul(req, res, data) {
  const { tugas, kelas } = kelasOf(req.params.tugasId);
  if (!tugas) { if (data.file_path) fs.unlink(path.join(__dirname, '..', '..', data.file_path.replace(/^\/+/, '')), () => {}); return fail(res, 'Tugas tidak ditemukan', 404); }
  if (!isMember(kelas.id, req.user.id)) return fail(res, 'Kamu bukan anggota kelas ini', 403);
  const stTugas = db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelas.id, req.user.id);
  if (!stTugas || stTugas.status !== 'aktif') return fail(res, 'Kamu sedang keluar kelas. Masuk kembali dulu untuk mengumpulkan.', 403);
  if (tugas.deadline && new Date(tugas.deadline) < new Date()) return fail(res, 'Deadline sudah lewat', 400);
  const lama = db.prepare('SELECT * FROM pengumpulan_tugas WHERE tugas_id = ? AND siswa_id = ?').get(tugas.id, req.user.id);
  if (lama && lama.status === 'dinilai') return fail(res, 'Sudah dinilai, tidak bisa kumpul ulang', 409);
  if (lama && lama.file_path && lama.file_path !== data.file_path) {
    fs.unlink(path.join(__dirname, '..', '..', lama.file_path.replace(/^\/+/, '')), () => {});
  }
  if (lama) {
    db.prepare(`UPDATE pengumpulan_tugas SET tipe=?, file_path=?, kode_program=?, bahasa=?, status='terkumpul', submitted_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(data.tipe, data.file_path, data.kode_program || null, data.bahasa || null, lama.id);
  } else {
    db.prepare(`INSERT INTO pengumpulan_tugas (tugas_id, siswa_id, tipe, file_path, kode_program, bahasa) VALUES (?,?,?,?,?,?)`)
      .run(tugas.id, req.user.id, data.tipe, data.file_path, data.kode_program || null, data.bahasa || null);
  }
  catatAktivitas(req.user.id, 'tugas');
  return ok(res, db.prepare('SELECT * FROM pengumpulan_tugas WHERE tugas_id = ? AND siswa_id = ?').get(tugas.id, req.user.id), 'Tugas terkumpul', 201);
}

// GET /api/tugas/tugas/:tugasId/pengumpulan (mentor pemilik)
router.get('/tugas/:tugasId/pengumpulan', verifyToken, requireRole('mentor'), (req, res) => {
  const { tugas, kelas } = kelasOf(req.params.tugasId);
  if (!tugas) return fail(res, 'Tugas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const rows = db.prepare(`SELECT p.*, u.nama AS siswa_nama, u.email AS siswa_email FROM pengumpulan_tugas p JOIN users u ON u.id = p.siswa_id WHERE p.tugas_id = ? ORDER BY p.submitted_at DESC`).all(tugas.id);
  return ok(res, rows);
});

// PUT /api/pengumpulan/:id/nilai (mentor pemilik kelas)
router.put('/pengumpulan/:id/nilai', verifyToken, requireRole('mentor'), (req, res) => {
  const p = db.prepare('SELECT * FROM pengumpulan_tugas WHERE id = ?').get(req.params.id);
  if (!p) return fail(res, 'Pengumpulan tidak ditemukan', 404);
  const { kelas } = kelasOf(p.tugas_id);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { nilai, feedback } = req.body || {};
  const n = Number(nilai);
  if (!Number.isInteger(n) || n < 0 || n > 100) return fail(res, 'Nilai harus 0–100');
  db.prepare(`UPDATE pengumpulan_tugas SET nilai=?, feedback=?, status='dinilai', graded_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(n, (feedback || '').trim() || null, p.id);
  const info = db.prepare('SELECT * FROM tugas WHERE id = ?').get(p.tugas_id);
  notifyUser(p.siswa_id, kelas.id, `✅ Tugas dinilai: ${n}`, `${info ? info.judul : 'Tugas'} · ${kelas.nama_kelas}`);
  return ok(res, db.prepare('SELECT * FROM pengumpulan_tugas WHERE id = ?').get(p.id), 'Nilai tersimpan');
});

// GET /api/tugas/tugas/:tugasId/nilai-saya (siswa)
router.get('/tugas/:tugasId/nilai-saya', verifyToken, requireRole('siswa'), (req, res) => {
  const row = db.prepare('SELECT id, tipe, bahasa, nilai, feedback, status, submitted_at, graded_at FROM pengumpulan_tugas WHERE tugas_id = ? AND siswa_id = ?').get(req.params.tugasId, req.user.id);
  if (!row) return fail(res, 'Belum mengumpulkan', 404);
  return ok(res, row);
});

module.exports = router;
