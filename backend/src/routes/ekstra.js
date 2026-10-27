// Fitur ekstra (dari referensi localStorage): notifikasi, pengumuman,
// kick/ban siswa + permintaan akses kembali.
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const keamanan = require('../utils/keamanan');
const { pagine } = require('../utils/paginasi');
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
  const { limit, offset, q } = pagine(req);
  const cari = q ? ' AND (n.judul LIKE ? OR n.isi LIKE ?)' : '';
  const args = q ? [req.user.id, `%${q}%`, `%${q}%`] : [req.user.id];
  const rows = db.prepare(`SELECT n.*, k.nama_kelas FROM notifikasi n LEFT JOIN kelas k ON k.id = n.kelas_id WHERE n.user_id = ?${cari} ORDER BY n.dibaca, n.id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
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
const PENGATURAN_BOLEH = new Set(['sambutan', 'kontak_wa', 'kontak_ig', 'kontak_email', 'kontak_github']);
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
  const { limit, offset, q } = pagine(req);
  const cari = q ? ' WHERE (p.judul LIKE ? OR p.isi LIKE ?)' : '';
  const args = q ? [`%${q}%`, `%${q}%`] : [];
  const rows = db.prepare(`SELECT p.*, u.nama AS mentor_nama FROM pengumuman p JOIN users u ON u.id = p.mentor_id${cari} ORDER BY p.id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
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

// ---------- Pantau siswa (SEMUA akun siswa terdaftar + online) ----------
router.get('/pantau', verifyToken, requireRole('mentor'), (req, res) => {
  const kelasSaya = db.prepare('SELECT id, nama_kelas FROM kelas WHERE mentor_id = ? ORDER BY id').all(req.user.id);
  const ids = kelasSaya.map((k) => k.id);
  const stmtKelasSiswa = db.prepare(`SELECT k.nama_kelas FROM kelas_member km JOIN kelas k ON k.id = km.kelas_id WHERE km.siswa_id = ? AND k.mentor_id = ?`);
  // SEMUA siswa yang terdaftar di platform (bukan hanya anggota kelas mentor ini),
  // lengkap dengan status online (< 5 mnt) dan status blokir akun global.
  const siswa = db.prepare(`SELECT id, nama, email, username, created_at, diblokir, blokir_alasan, diblokir_pada, last_seen,
      CASE WHEN last_seen >= datetime('now', '-5 minutes') THEN 1 ELSE 0 END AS online
      FROM users WHERE role = 'siswa' ORDER BY diblokir DESC, online DESC, nama`).all()
    .map((s) => ({ ...s, kelas: stmtKelasSiswa.all(s.id, req.user.id).map((r) => r.nama_kelas) }));
  let banned = [], pending = [];
  if (ids.length) {
    banned = db.prepare(`SELECT b.*, u.nama, u.email, k.nama_kelas FROM banned b JOIN users u ON u.id = b.siswa_id JOIN kelas k ON k.id = b.kelas_id WHERE k.mentor_id = ? ORDER BY b.id DESC`).all(req.user.id);
    pending = db.prepare(`SELECT r.*, u.nama, u.email, k.nama_kelas FROM access_requests r JOIN users u ON u.id = r.siswa_id JOIN kelas k ON k.id = r.kelas_id WHERE k.mentor_id = ? AND r.status = 'pending' ORDER BY r.id DESC`).all(req.user.id);
  }
  const online = siswa.filter((s) => s.online).length;
  return ok(res, { kelas: kelasSaya, siswa, banned, pending, total_siswa: siswa.length, online });
});

// ---------- Rekap transkrip per kelas (matriks siswa × tugas + rata-rata bulanan) ----------
router.get('/kelas/:id/rekap', verifyToken, requireRole('mentor'), (req, res) => {
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const daftarTugas = db.prepare('SELECT id, judul FROM tugas WHERE kelas_id = ? ORDER BY id').all(kelas.id);
  const daftarKuis = db.prepare('SELECT id, judul FROM kuis WHERE kelas_id = ? ORDER BY id').all(kelas.id);
  const daftarSiswa = db.prepare(`SELECT u.id, u.nama, u.username, u.email FROM kelas_member km JOIN users u ON u.id = km.siswa_id WHERE km.kelas_id = ? ORDER BY u.nama`).all(kelas.id);
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
    const nilai_kuis = {};
    const angkaKuis = [];
    for (const k of daftarKuis) {
      const h = db.prepare('SELECT skor FROM hasil_kuis WHERE kuis_id = ? AND siswa_id = ?').get(k.id, s.id);
      nilai_kuis[k.id] = h ? h.skor : null;
      if (h) angkaKuis.push(h.skor);
    }
    const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
    const bulanan = {};
    for (const [bl, arr] of Object.entries(perBulan[s.id] || {})) {
      bulanan[bl] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    }
    const semua = [...angka, ...angkaKuis];
    return { ...s, nilai, rata2: avg(angka), nilai_kuis, rata_kuis: avg(angkaKuis), rata_total: avg(semua), bulanan };
  });
  return ok(res, { kelas, tugas: daftarTugas, kuis: daftarKuis, siswa });
});

// ---------- Ringkas aktivitas harian (grid kontribusi, 70 hari) ----------
router.get('/aktivitas/ringkas', verifyToken, (req, res) => {
  const rows = db.prepare(`SELECT substr(created_at, 1, 10) AS tgl, COUNT(*) AS jml FROM aktivitas WHERE user_id = ? AND created_at >= date('now', '-69 days') GROUP BY tgl`).all(req.user.id);
  return ok(res, Object.fromEntries(rows.map((r) => [r.tgl, r.jml])));
});

// GET /pantau/siswa/:siswaId (mentor) — snapshot read-only tampilan peran siswa.
// JAMINAN: hanya SELECT, tidak menulis apa pun → tidak mempengaruhi siswa.
router.get('/pantau/siswa/:siswaId', verifyToken, requireRole('mentor'), (req, res) => {
  const s = db.prepare('SELECT id, nama, username, email, role, created_at FROM users WHERE id = ?').get(req.params.siswaId);
  if (!s || s.role !== 'siswa') return fail(res, 'Siswa tidak ditemukan', 404);
  const kelas = db.prepare(`SELECT k.id, k.nama_kelas, km.status FROM kelas_member km JOIN kelas k ON k.id = km.kelas_id WHERE km.siswa_id = ? AND k.mentor_id = ? ORDER BY k.id`).all(s.id, req.user.id);
  const ringkas = Object.fromEntries(db.prepare(`SELECT substr(created_at,1,10) tgl, COUNT(*) jml FROM aktivitas WHERE user_id = ? AND created_at >= date('now','-69 days') GROUP BY tgl`).all(s.id).map((r) => [r.tgl, r.jml]));
  const tugasDinilai = db.prepare(`SELECT t.judul AS apa, p.nilai, k.nama_kelas, 'tugas' AS jenis FROM pengumpulan_tugas p JOIN tugas t ON t.id = p.tugas_id JOIN kelas k ON k.id = t.kelas_id WHERE p.siswa_id = ? AND p.status = 'dinilai' AND k.mentor_id = ? ORDER BY p.graded_at DESC LIMIT 20`).all(s.id, req.user.id);
  const kuisSkor = db.prepare(`SELECT q.judul AS apa, h.skor AS nilai, k.nama_kelas, 'kuis' AS jenis FROM hasil_kuis h JOIN kuis q ON q.id = h.kuis_id JOIN kelas k ON k.id = q.kelas_id WHERE h.siswa_id = ? AND k.mentor_id = ? ORDER BY h.submitted_at DESC LIMIT 20`).all(s.id, req.user.id);
  // ?kelas=ID → progres per pertemuan 1–14 (modul dibaca, tugas, kuis)
  if (req.query.kelas) {
    const k = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.query.kelas);
    if (!k || k.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
    const dibaca = new Set(db.prepare(`SELECT DISTINCT substr(jenis, 6) AS mid FROM aktivitas WHERE user_id = ? AND jenis LIKE 'baca:%'`).all(s.id).map((r) => String(r.mid)));
    const progres = [];
    for (let p = 1; p <= 14; p++) {
      const materi = db.prepare('SELECT id, judul FROM materi WHERE kelas_id = ? AND pertemuan = ? ORDER BY urutan, id').all(k.id, p)
        .map((m) => ({ ...m, dibaca: dibaca.has(String(m.id)) }));
      const tugas = db.prepare(`SELECT t.id, t.judul, t.deadline, p.status, p.nilai, p.feedback, p.file_path, p.bahasa, p.submitted_at FROM tugas t LEFT JOIN pengumpulan_tugas p ON p.tugas_id = t.id AND p.siswa_id = ? WHERE t.kelas_id = ? AND t.pertemuan = ? ORDER BY t.id`).all(s.id, k.id, p);
      const kuis = db.prepare(`SELECT q.id, q.judul, h.skor, h.submitted_at FROM kuis q LEFT JOIN hasil_kuis h ON h.kuis_id = q.id AND h.siswa_id = ? WHERE q.kelas_id = ? AND q.pertemuan = ? ORDER BY q.id`).all(s.id, k.id, p);
      progres.push({ p, materi, tugas, kuis });
    }
    return ok(res, { siswa: s, kelas: k, progres });
  }
  return ok(res, { siswa: s, kelas, ringkas, nilai: [...tugasDinilai, ...kuisSkor] });
});

// ---------- Blokir permanent: akun dihapus total + email diblokir selamanya ----------
// Daftar (mentor lihat siapa saja yang sudah dihapus permanen)
router.get('/blokir-permanen', verifyToken, requireRole('mentor'), (req, res) => {
  const rows = db.prepare('SELECT * FROM blokir_permanen ORDER BY id DESC').all();
  return ok(res, rows);
});

// Eksekusi blokir permanent — mentor boleh menghapus SEMBARANG akun siswa terdaftar
// (bukan hanya yang ada di kelasnya), sejalan dengan fitur pantau "semua siswa".
router.post('/blokir-permanen', verifyToken, requireRole('mentor'), (req, res) => {
  const { siswa_id } = req.body || {};
  const s = db.prepare('SELECT * FROM users WHERE id = ?').get(siswa_id);
  if (!s || s.role !== 'siswa') return fail(res, 'Siswa tidak ditemukan', 404);
  // 1. kumpulkan file fisik miliknya (tugas yang dikumpulkan)
  const files = db.prepare('SELECT file_path FROM pengumpulan_tugas WHERE siswa_id = ? AND file_path IS NOT NULL').all(s.id);
  // 2. hapus akun → CASCADE membersihkan member, pengumpulan, hasil kuis, diskusi, banned, request, notifikasi, aktivitas
  db.prepare('DELETE FROM users WHERE id = ?').run(s.id);
  let n = 0;
  for (const f of files) {
    try { fs.unlinkSync(path.join(__dirname, '..', '..', String(f.file_path).replace(/^\/+/, ''))); n++; } catch {}
  }
  // 3. kunci email agar tak bisa login/daftar lagi
  db.prepare('INSERT OR IGNORE INTO blokir_permanen (email, username, nama, oleh_mentor_id) VALUES (?,?,?,?)').run(s.email, s.username || null, s.nama, req.user.id);
  return ok(res, { file_dihapus: n }, `⛔ ${s.nama} diblokir permanen, akun + ${n} file terhapus`);
});

// Buka blokir permanent (email bisa dipakai lagi)
router.delete('/blokir-permanen/:id', verifyToken, requireRole('mentor'), (req, res) => {
  db.prepare('DELETE FROM blokir_permanen WHERE id = ?').run(req.params.id);
  return ok(res, null, 'Blokir permanent dibuka');
});

// Bersihkan SELURUH riwayat blokir permanent (daftar jadi kosong;
// konsekuensi: email-email itu bisa dipakai daftar lagi).
router.delete('/blokir-permanen', verifyToken, requireRole('mentor'), (req, res) => {
  const info = db.prepare('DELETE FROM blokir_permanen').run();
  return ok(res, { dibersihkan: info.changes }, `Riwayat dibersihkan (${info.changes} nama)`);
});

// PUT /api/users/:id/reset-password (mentor) — solusi lupa password tanpa SMTP.
// Hanya untuk siswa di kelas mentor tersebut.
router.put('/users/:id/reset-password', verifyToken, requireRole('mentor'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u || u.role !== 'siswa') return fail(res, 'Siswa tidak ditemukan', 404);
  const relasi = db.prepare(`SELECT 1 WHERE
    EXISTS (SELECT 1 FROM kelas_member km JOIN kelas k ON k.id = km.kelas_id WHERE km.siswa_id = ? AND k.mentor_id = ?) OR
    EXISTS (SELECT 1 FROM banned b JOIN kelas k ON k.id = b.kelas_id WHERE b.siswa_id = ? AND k.mentor_id = ?)`)
    .get(u.id, req.user.id, u.id, req.user.id);
  if (!relasi) return fail(res, 'Bukan siswa di kelasmu', 403);
  const { password_baru } = req.body || {};
  if (!keamanan.kuatPassword(password_baru)) return fail(res, 'Password baru minimal 6 karakter');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(keamanan.hashPassword(password_baru), u.id);
  return ok(res, null, `Password ${u.nama} direset menjadi: ${password_baru}`);
});

// ---------- Blokir akun siswa GLOBAL (sementara, bisa dibuka) ----------
// Beda dengan "ban per-kelas" (siswa masih bisa login & buka kelas lain) dan
// "blokir permanent" (akun dihapus total). Blokir akun = suspend seluruh akses,
// sampai mentor membukanya kembali.
router.put('/users/:siswaId/blokir', verifyToken, requireRole('mentor'), (req, res) => {
  const s = db.prepare('SELECT id, nama, role FROM users WHERE id = ?').get(req.params.siswaId);
  if (!s || s.role !== 'siswa') return fail(res, 'Siswa tidak ditemukan', 404);
  const alasan = String((req.body || {}).alasan || '').trim().slice(0, 200) || 'Diblokir oleh mentor';
  db.prepare(`UPDATE users SET diblokir = 1, blokir_alasan = ?, diblokir_pada = CURRENT_TIMESTAMP WHERE id = ?`).run(alasan, s.id);
  return ok(res, { id: s.id, nama: s.nama, alasan }, `Akun ${s.nama} diblokir (seluruh akses ditolak)`);
});

router.delete('/users/:siswaId/blokir', verifyToken, requireRole('mentor'), (req, res) => {
  const s = db.prepare('SELECT id, nama, role FROM users WHERE id = ?').get(req.params.siswaId);
  if (!s || s.role !== 'siswa') return fail(res, 'Siswa tidak ditemukan', 404);
  db.prepare(`UPDATE users SET diblokir = 0, blokir_alasan = NULL, diblokir_pada = NULL WHERE id = ?`).run(s.id);
  return ok(res, { id: s.id, nama: s.nama }, `Blokir akun ${s.nama} dibuka`);
});

module.exports = router;
