// Fitur ekstra (dari referensi localStorage): notifikasi, pengumuman,
// kick/ban siswa + permintaan akses kembali.
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyUser, notifyKelas } = require('../utils/notifikasi');

const router = express.Router();
const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message, data: null });

function milikMentor(kelasId, mentorId) {
  const k = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kelasId);
  if (!k) return { err: 'Kelas tidak ditemukan', code: 404 };
  if (k.mentor_id !== mentorId) return { err: 'Bukan kelas milikmu', code: 403 };
  return { kelas: k };
}

// ---------- Notifikasi milikku ----------
router.get('/notifikasi', verifyToken, (req, res) => {
  const rows = db.prepare(`SELECT n.*, k.nama_kelas FROM notifikasi n LEFT JOIN kelas k ON k.id = n.kelas_id WHERE n.user_id = ? ORDER BY n.dibaca, n.id DESC LIMIT 30`).all(req.user.id);
  return ok(res, rows);
});
router.get('/notifikasi/belum-baca', verifyToken, (req, res) => {
  const c = db.prepare('SELECT COUNT(*) c FROM notifikasi WHERE user_id = ? AND dibaca = 0').get(req.user.id).c;
  return ok(res, { belum_baca: c });
});
router.put('/notifikasi/baca-semua', verifyToken, (req, res) => {
  db.prepare('UPDATE notifikasi SET dibaca = 1 WHERE user_id = ?').run(req.user.id);
  return ok(res, null, 'Semua ditandai dibaca');
});
router.put('/notifikasi/:id/baca', verifyToken, (req, res) => {
  db.prepare('UPDATE notifikasi SET dibaca = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  return ok(res, null, 'Ditandai dibaca');
});

// ---------- Pengumuman mentor → inbox semua anggota ----------
router.post('/kelas/:id/pengumuman', verifyToken, requireRole('mentor'), (req, res) => {
  const { err, code, kelas } = milikMentor(req.params.id, req.user.id);
  if (err) return fail(res, err, code);
  const { isi } = req.body || {};
  if (!isi || !String(isi).trim()) return fail(res, 'Isi pengumuman wajib diisi');
  notifyKelas(kelas.id, `📢 ${kelas.nama_kelas}`, String(isi).trim());
  return ok(res, null, 'Pengumuman terkirim ke semua anggota', 201);
});

// ---------- Ban / kick ----------
// GET daftar banned + permintaan akses pending
router.get('/kelas/:id/moderasi', verifyToken, requireRole('mentor'), (req, res) => {
  const { err, code, kelas } = milikMentor(req.params.id, req.user.id);
  if (err) return fail(res, err, code);
  const banned = db.prepare(`SELECT b.*, u.nama, u.email FROM banned b JOIN users u ON u.id = b.siswa_id WHERE b.kelas_id = ? ORDER BY b.id DESC`).all(kelas.id);
  const pending = db.prepare(`SELECT r.*, u.nama, u.email FROM access_requests r JOIN users u ON u.id = r.siswa_id WHERE r.kelas_id = ? AND r.status = 'pending' ORDER BY r.id DESC`).all(kelas.id);
  return ok(res, { banned, pending });
});

// POST ban (kick + blokir join ulang)
router.post('/kelas/:id/ban', verifyToken, requireRole('mentor'), (req, res) => {
  const { err, code, kelas } = milikMentor(req.params.id, req.user.id);
  if (err) return fail(res, err, code);
  const { siswa_id, alasan } = req.body || {};
  if (!siswa_id) return fail(res, 'siswa_id wajib diisi');
  db.prepare('DELETE FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').run(kelas.id, siswa_id);
  db.prepare('INSERT OR IGNORE INTO banned (kelas_id, siswa_id, alasan) VALUES (?,?,?)')
    .run(kelas.id, siswa_id, (alasan || '').trim() || null);
  notifyUser(siswa_id, kelas.id, `⛔ Dikeluarkan dari ${kelas.nama_kelas}`, alasan || 'Hubungi mentor untuk minta akses kembali.');
  return ok(res, null, 'Siswa dikeluarkan + diblokir', 201);
});

// DELETE unban
router.delete('/kelas/:id/ban/:siswaId', verifyToken, requireRole('mentor'), (req, res) => {
  const { err, code, kelas } = milikMentor(req.params.id, req.user.id);
  if (err) return fail(res, err, code);
  db.prepare('DELETE FROM banned WHERE kelas_id = ? AND siswa_id = ?').run(kelas.id, req.params.siswaId);
  return ok(res, null, 'Blokir dibuka, siswa bisa gabung lagi');
});

// PUT putuskan permintaan akses {keputusan: 'setuju'|'tolak'}
router.put('/permintaan-akses/:reqId', verifyToken, requireRole('mentor'), (req, res) => {
  const r = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(req.params.reqId);
  if (!r) return fail(res, 'Permintaan tidak ditemukan', 404);
  const { err, code, kelas } = milikMentor(r.kelas_id, req.user.id);
  if (err) return fail(res, err, code);
  const { keputusan } = req.body || {};
  if (keputusan === 'setuju') {
    db.prepare('DELETE FROM banned WHERE kelas_id = ? AND siswa_id = ?').run(r.kelas_id, r.siswa_id);
    db.prepare('INSERT OR IGNORE INTO kelas_member (kelas_id, siswa_id) VALUES (?,?)').run(r.kelas_id, r.siswa_id);
    db.prepare("UPDATE access_requests SET status = 'disetujui' WHERE id = ?").run(r.id);
    notifyUser(r.siswa_id, r.kelas_id, `✅ Akses ${kelas.nama_kelas} disetujui`, 'Silakan masuk kembali ke kelas.');
    return ok(res, null, 'Akses disetujui, siswa masuk kembali');
  }
  db.prepare("UPDATE access_requests SET status = 'ditolak' WHERE id = ?").run(r.id);
  return ok(res, null, 'Permintaan ditolak');
});

// ---------- Pengaturan (teks sambutan + kontak, diubah mentor) ----------
const PENGATURAN_BOLEH = new Set(['sambutan', 'kontak_wa', 'kontak_ig', 'kontak_email']);
router.get('/pengaturan', verifyToken, (req, res) => {
  const rows = db.prepare('SELECT kunci, nilai FROM settings').all();
  return ok(res, Object.fromEntries(rows.map((r) => [r.kunci, r.nilai])));
});
router.put('/pengaturan', verifyToken, requireRole('mentor'), (req, res) => {
  const { kunci, nilai } = req.body || {};
  if (!PENGATURAN_BOLEH.has(kunci)) return fail(res, 'Kunci pengaturan tidak dikenal');
  db.prepare('INSERT INTO settings (kunci, nilai) VALUES (?,?) ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai')
    .run(kunci, String(nilai ?? '').slice(0, 1000));
  return ok(res, { kunci, nilai }, 'Pengaturan tersimpan');
});

// ---------- Pengumuman sistem (global, buat/hapus mentor) ----------
router.get('/pengumuman', verifyToken, (req, res) => {
  const rows = db.prepare(`SELECT p.*, u.nama AS mentor_nama FROM pengumuman p JOIN users u ON u.id = p.mentor_id ORDER BY p.id DESC LIMIT 20`).all();
  return ok(res, rows);
});
router.post('/pengumuman', verifyToken, requireRole('mentor'), (req, res) => {
  const { judul, isi } = req.body || {};
  if (!judul || !isi) return fail(res, 'Judul dan isi wajib diisi');
  const info = db.prepare('INSERT INTO pengumuman (mentor_id, judul, isi) VALUES (?,?,?)')
    .run(req.user.id, String(judul).trim(), String(isi).trim());
  // masukkan juga ke inbox semua siswa
  const semua = db.prepare("SELECT id FROM users WHERE role = 'siswa'").all();
  const tambah = db.prepare('INSERT INTO notifikasi (user_id, kelas_id, judul, isi) VALUES (?,?,?,?)');
  for (const s of semua) tambah.run(s.id, null, `📢 ${String(judul).trim()}`, String(isi).trim());
  return ok(res, db.prepare('SELECT * FROM pengumuman WHERE id = ?').get(info.lastInsertRowid), 'Pengumuman diterbitkan', 201);
});
router.delete('/pengumuman/:id', verifyToken, requireRole('mentor'), (req, res) => {
  db.prepare('DELETE FROM pengumuman WHERE id = ?').run(req.params.id);
  return ok(res, null, 'Pengumuman dihapus');
});

// ---------- Pantau siswa (semua kelas milik mentor) ----------
router.get('/pantau', verifyToken, requireRole('mentor'), (req, res) => {
  const kelasSaya = db.prepare('SELECT id, nama_kelas FROM kelas WHERE mentor_id = ? ORDER BY id').all(req.user.id);
  const ids = kelasSaya.map((k) => k.id);
  let siswa = [], banned = [], pending = [];
  if (ids.length) {
    const q = `(${ids.map(() => '?').join(',')})`;
    siswa = db.prepare(`SELECT DISTINCT u.id, u.nama, u.email FROM kelas_member km JOIN users u ON u.id = km.siswa_id WHERE km.kelas_id IN ${q} ORDER BY u.nama`).all(...ids);
    const stmtKelasSiswa = db.prepare(`SELECT k.nama_kelas FROM kelas_member km JOIN kelas k ON k.id = km.kelas_id WHERE km.siswa_id = ? AND k.mentor_id = ?`);
    siswa = siswa.map((s) => ({ ...s, kelas: stmtKelasSiswa.all(s.id, req.user.id).map((r) => r.nama_kelas) }));
    banned = db.prepare(`SELECT b.*, u.nama, u.email, k.nama_kelas FROM banned b JOIN users u ON u.id = b.siswa_id JOIN kelas k ON k.id = b.kelas_id WHERE k.mentor_id = ? ORDER BY b.id DESC`).all(req.user.id);
    pending = db.prepare(`SELECT r.*, u.nama, u.email, k.nama_kelas FROM access_requests r JOIN users u ON u.id = r.siswa_id JOIN kelas k ON k.id = r.kelas_id WHERE k.mentor_id = ? AND r.status = 'pending' ORDER BY r.id DESC`).all(req.user.id);
  }
  return ok(res, { kelas: kelasSaya, siswa, banned, pending });
});

// ---------- Rekap transkrip per kelas (matriks siswa × tugas + rata-rata bulanan) ----------
router.get('/kelas/:id/rekap', verifyToken, requireRole('mentor'), (req, res) => {
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const daftarTugas = db.prepare('SELECT id, judul FROM tugas WHERE kelas_id = ? ORDER BY id').all(kelas.id);
  const daftarSiswa = db.prepare(`SELECT u.id, u.nama, u.email FROM kelas_member km JOIN users u ON u.id = km.siswa_id WHERE km.kelas_id = ? ORDER BY u.nama`).all(kelas.id);
  const kumpul = db.prepare(`SELECT p.* FROM pengumpulan_tugas p JOIN tugas t ON t.id = p.tugas_id WHERE t.kelas_id = ?`).all(kelas.id);
  const perSel = {};
  const perBulan = {};
  for (const p of kumpul) {
    perSel[`${p.siswa_id}:${p.tugas_id}`] = { p_id: p.id, nilai: p.nilai, status: p.status };
    if (p.status === 'dinilai' && p.nilai !== null && p.graded_at) {
      const bl = String(p.graded_at).slice(0, 7);
      (perBulan[p.siswa_id] = perBulan[p.siswa_id] || {});
      (perBulan[p.siswa_id][bl] = perBulan[p.siswa_id][bl] || []).push(p.nilai);
    }
  }
  const siswa = daftarSiswa.map((s) => {
    const nilai = {};
    const angka = [];
    for (const t of daftarTugas) {
      const sel = perSel[`${s.id}:${t.id}`] || null;
      nilai[t.id] = sel;
      if (sel && sel.nilai !== null) angka.push(sel.nilai);
    }
    const bulanan = {};
    for (const [bl, arr] of Object.entries(perBulan[s.id] || {})) {
      bulanan[bl] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    }
    return { ...s, nilai, rata2: angka.length ? Math.round(angka.reduce((a, b) => a + b, 0) / angka.length) : null, bulanan };
  });
  return ok(res, { kelas, tugas: daftarTugas, siswa });
});

// ---------- Ringkas aktivitas harian (grid kontribusi, 70 hari) ----------
router.get('/aktivitas/ringkas', verifyToken, (req, res) => {
  const rows = db.prepare(`SELECT substr(created_at, 1, 10) AS tgl, COUNT(*) AS jml FROM aktivitas WHERE user_id = ? AND created_at >= date('now', '-69 days') GROUP BY tgl`).all(req.user.id);
  return ok(res, Object.fromEntries(rows.map((r) => [r.tgl, r.jml])));
});

module.exports = router;
