// Kuis PG + soal + submit jawaban (nilai otomatis) + hasil.
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyKelas, notifyUser } = require('../utils/notifikasi');
const { catatAktivitas } = require('../utils/notifikasi');
const { esaiBenar } = require('../utils/kemiripan');
const { pagine } = require('../utils/paginasi');

const router = express.Router();
const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message, data: null });

function isMember(kelasId, userId) {
  return !!db.prepare('SELECT id FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelasId, userId);
}

// GET /api/kelas/:id/kuis — hanya yang sedang MASUK kelas
router.get('/kelas/:id/kuis', verifyToken, (req, res) => {
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(req.params.id);
  if (!kelas) return fail(res, 'Kelas tidak ditemukan', 404);
  if (kelas.mentor_id !== req.user.id && !isMember(kelas.id, req.user.id)) return fail(res, 'Bukan anggota kelas ini', 403);
  if (req.user.role === 'siswa') {
    const st = db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelas.id, req.user.id);
    if (!st || st.status !== 'aktif') return fail(res, 'Masuk kembali ke kelas untuk mengakses kuis.', 403);
  }
  const { limit, offset, q } = pagine(req);
  const cari = q ? ' AND (judul LIKE ? OR deskripsi LIKE ?)' : '';
  const args = q ? [kelas.id, `%${q}%`, `%${q}%`] : [kelas.id];
  const rows = db.prepare(`SELECT k.*, (SELECT COUNT(*) FROM soal s WHERE s.kuis_id = k.id) AS jml_soal FROM kuis k WHERE k.kelas_id = ?${cari} ORDER BY k.id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
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
  const { judul, deskripsi, durasi_menit, deadline, pertemuan } = req.body || {};
  if (!judul) return fail(res, 'Judul wajib diisi');
  const pert = Math.min(14, Math.max(1, Number(pertemuan) || 1));
  const info = db.prepare('INSERT INTO kuis (kelas_id, judul, deskripsi, durasi_menit, deadline, pertemuan) VALUES (?,?,?,?,?,?)')
    .run(kelas.id, String(judul).trim(), (deskripsi || '').trim(), Number(durasi_menit) || 30, deadline || null, pert);
  notifyKelas(kelas.id, `📝 Kuis baru: ${String(judul).trim()}`, `Kelas ${kelas.nama_kelas}`);
  return ok(res, db.prepare('SELECT * FROM kuis WHERE id = ?').get(info.lastInsertRowid), 'Kuis dibuat', 201);
});

// PUT /api/kuis/:kuisId (mentor pemilik kelas) — edit judul/deskripsi/pertemuan
router.put('/kuis/:kuisId', verifyToken, requireRole('mentor'), (req, res) => {
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(req.params.kuisId);
  if (!kuis) return fail(res, 'Kuis tidak ditemukan', 404);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kuis.kelas_id);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { judul, deskripsi, durasi_menit, deadline, pertemuan } = req.body || {};
  db.prepare('UPDATE kuis SET judul = COALESCE(?, judul), deskripsi = COALESCE(?, deskripsi), durasi_menit = COALESCE(?, durasi_menit), deadline = ?, pertemuan = COALESCE(?, pertemuan) WHERE id = ?')
    .run(judul ?? null, deskripsi ?? null, durasi_menit ?? null, deadline || null, pertemuan ? Math.min(14, Math.max(1, Number(pertemuan))) : null, kuis.id);
  return ok(res, db.prepare('SELECT * FROM kuis WHERE id = ?').get(kuis.id), 'Kuis diperbarui');
});

// POST /api/kuis/kuis/:kuisId/soal (mentor pemilik kelas)
router.post('/kuis/:kuisId/soal', verifyToken, requireRole('mentor'), (req, res) => {
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(req.params.kuisId);
  if (!kuis) return fail(res, 'Kuis tidak ditemukan', 404);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kuis.kelas_id);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, kunci, kunci_esai, tipe, bobot } = req.body || {};
  if (!pertanyaan) return fail(res, 'Pertanyaan wajib diisi');
  const t = tipe === 'essay' ? 'essay' : 'pg';
  const o = t === 'essay' ? ['-', '-', '-', '-'] : [opsi_a, opsi_b, opsi_c, opsi_d];
  if (t === 'pg' && o.some((x) => !x)) return fail(res, 'PG wajib punya 4 opsi');
  const k = t === 'essay' ? 'A' : String(kunci || 'A').toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(k)) return fail(res, 'Kunci harus A/B/C/D');
  const bob = Math.min(100, Math.max(1, Number(bobot) || 1));
  const ke = t === 'essay' ? String(kunci_esai || '').trim().slice(0, 2000) || null : null;
  const info = db.prepare('INSERT INTO soal (kuis_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, kunci, tipe, bobot, kunci_esai) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(kuis.id, pertanyaan, ...o, k, t, bob, ke);
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
  if (req.user.role === 'siswa') {
    const st = db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelas.id, req.user.id);
    if (!st || st.status !== 'aktif') return fail(res, 'Masuk kembali ke kelas untuk mengakses kuis.', 403);
  }
  const acak = req.user.role === 'siswa' ? 'RANDOM()' : 'id'; // soal diacak untuk siswa
  const rows = db.prepare(`SELECT * FROM soal WHERE kuis_id = ? ORDER BY ${acak}`).all(kuis.id);
  if (req.user.role === 'siswa') return ok(res, rows.map(({ kunci, ...s }) => s));
  return ok(res, rows);
});

// POST /api/kuis/:kuisId/mulai (siswa) — catat waktu mulai untuk timer server
router.post('/kuis/:kuisId/mulai', verifyToken, requireRole('siswa'), (req, res) => {
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(req.params.kuisId);
  if (!kuis) return fail(res, 'Kuis tidak ditemukan', 404);
  if (!isMember(kuis.kelas_id, req.user.id)) return fail(res, 'Bukan anggota kelas ini', 403);
  const st = db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kuis.kelas_id, req.user.id);
  if (!st || st.status !== 'aktif') return fail(res, 'Masuk kembali untuk mengerjakan.', 403);
  if (kuis.deadline && new Date(kuis.deadline) < new Date()) return fail(res, 'Deadline kuis sudah lewat', 400);
  const lama = db.prepare('SELECT * FROM hasil_kuis WHERE kuis_id = ? AND siswa_id = ?').get(kuis.id, req.user.id);
  if (lama && Object.keys(JSON.parse(lama.jawaban || '{}')).length) {
    return fail(res, 'Kuis sudah dikumpulkan (maks 1 percobaan)', 409);
  }
  if (!lama) {
    db.prepare(`INSERT INTO hasil_kuis (kuis_id, siswa_id, skor, jawaban, mulai_pada) VALUES (?,?,0,'{}',CURRENT_TIMESTAMP)`).run(kuis.id, req.user.id);
  }
  const row = db.prepare('SELECT mulai_pada FROM hasil_kuis WHERE kuis_id = ? AND siswa_id = ?').get(kuis.id, req.user.id);
  return ok(res, { mulai_pada: row.mulai_pada, durasi_menit: kuis.durasi_menit }, 'Kuis dimulai, timer berjalan', 201);
});

// POST /api/kuis/:kuisId/submit (siswa) — wajib mulai dulu; timer ditegakkan server
router.post('/kuis/:kuisId/submit', verifyToken, requireRole('siswa'), (req, res) => {
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(req.params.kuisId);
  if (!kuis) return fail(res, 'Kuis tidak ditemukan', 404);
  if (!isMember(kuis.kelas_id, req.user.id)) return fail(res, 'Bukan anggota kelas ini', 403);
  const stKuis = db.prepare('SELECT status FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kuis.kelas_id, req.user.id);
  if (!stKuis || stKuis.status !== 'aktif') return fail(res, 'Kamu sedang keluar kelas. Masuk kembali untuk mengerjakan.', 403);
  if (kuis.deadline && new Date(kuis.deadline) < new Date()) return fail(res, 'Deadline kuis sudah lewat', 400);
  const progres = db.prepare('SELECT * FROM hasil_kuis WHERE kuis_id = ? AND siswa_id = ?').get(kuis.id, req.user.id);
  if (!progres) return fail(res, 'Tekan Mulai dulu sebelum mengumpulkan', 400);
  if (Object.keys(JSON.parse(progres.jawaban || '{}')).length) {
    return fail(res, 'Kuis sudah dikumpulkan (maks 1 percobaan)', 409);
  }
  if (progres.mulai_pada) {
    // SQLite CURRENT_TIMESTAMP = UTC → parse eksplisit sebagai UTC (server boleh zona apa pun)
    const mulaiMs = new Date(String(progres.mulai_pada).replace(' ', 'T') + 'Z').getTime();
    const jalan = (Date.now() - mulaiMs) / 1000;
    if (jalan > (kuis.durasi_menit || 30) * 60 + 60) return fail(res, 'Waktu habis. Jawaban tidak diterima.', 403);
  }
  const { jawaban } = req.body || {};
  if (!jawaban || typeof jawaban !== 'object') return fail(res, 'Format jawaban: { soalId: "A" }');
  const daftar = db.prepare('SELECT id, kunci, kunci_esai, tipe, bobot FROM soal WHERE kuis_id = ?').all(kuis.id);
  if (!daftar.length) return fail(res, 'Kuis belum punya soal', 400);
  let benar = 0, totalPG = 0, esai = 0, benarBobot = 0, totalBobot = 0, esaiOtomatis = 0;
  for (const s of daftar) {
    const jwb = jawaban[s.id];
    const b = Math.max(1, Number(s.bobot) || 1);
    if ((s.tipe || 'pg') === 'essay') {
      if (!String(jwb || '').trim()) continue;
      if (s.kunci_esai && esaiBenar(jwb, s.kunci_esai).benar) {
        // cocok dengan kunci mentor → poin penuh otomatis
        benar++; totalPG++; benarBobot += b; totalBobot += b; esaiOtomatis++;
      } else esai++;
      continue;
    }
    totalPG++; totalBobot += b;
    if (String(jwb || '').toUpperCase() === s.kunci) { benar++; benarBobot += b; }
  }
  const skor = totalBobot ? Math.round((benarBobot / totalBobot) * 100) : 0;
  db.prepare('UPDATE hasil_kuis SET skor = ?, jawaban = ? WHERE id = ?').run(skor, JSON.stringify(jawaban), progres.id);
  catatAktivitas(req.user.id, 'kuis');
  return ok(res, { skor, benar, total: totalPG, esai_menunggu: esai, esai_otomatis: esaiOtomatis }, esai ? 'Tersimpan. Sebagian esai menunggu dinilai mentor.' : 'Kuis dinilai otomatis', 200);
});

// PUT /api/kuis/hasil/:hasilId/nilai (mentor pemilik kelas) — nilai final, untuk esai
router.put('/kuis/hasil/:hasilId/nilai', verifyToken, requireRole('mentor'), (req, res) => {
  const h = db.prepare('SELECT * FROM hasil_kuis WHERE id = ?').get(req.params.hasilId);
  if (!h) return fail(res, 'Hasil tidak ditemukan', 404);
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(h.kuis_id);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kuis.kelas_id);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const { skor, feedback } = req.body || {};
  const n = Number(skor);
  if (!Number.isInteger(n) || n < 0 || n > 100) return fail(res, 'Skor harus 0–100');
  db.prepare('UPDATE hasil_kuis SET skor = ?, feedback = ? WHERE id = ?').run(n, (feedback || '').trim() || null, h.id);
  notifyUser(h.siswa_id, kelas.id, `✅ Kuis dinilai: ${n}`, `${kuis.judul} · ${kelas.nama_kelas}`);
  return ok(res, db.prepare('SELECT * FROM hasil_kuis WHERE id = ?').get(h.id), 'Nilai final tersimpan');
});

// DELETE /api/kuis/:kuisId (mentor pemilik kelas) — hapus TOTAL: kuis + soal + kunci + hasil semua siswa
router.delete('/kuis/:kuisId', verifyToken, requireRole('mentor'), (req, res) => {
  const kuis = db.prepare('SELECT * FROM kuis WHERE id = ?').get(req.params.kuisId);
  if (!kuis) return fail(res, 'Kuis tidak ditemukan', 404);
  const kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(kuis.kelas_id);
  if (kelas.mentor_id !== req.user.id) return fail(res, 'Bukan kelas milikmu', 403);
  const jmlSoal = db.prepare('SELECT COUNT(*) c FROM soal WHERE kuis_id = ?').get(kuis.id).c;
  const jmlHasil = db.prepare('SELECT COUNT(*) c FROM hasil_kuis WHERE kuis_id = ?').get(kuis.id).c;
  db.prepare('DELETE FROM kuis WHERE id = ?').run(kuis.id); // CASCADE: soal (+kunci esai) & hasil/jawaban
  return ok(res, { soal: jmlSoal, hasil: jmlHasil }, `Kuis + ${jmlSoal} soal & ${jmlHasil} hasil terhapus total`);
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
