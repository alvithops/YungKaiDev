// Helper notifikasi: mentor tambah materi/tugas/kuis/pengumuman → siswa dapat inbox.
// Dipakai lintas-tab via polling + BroadcastChannel di frontend (js/realtime.js).
const db = require('../config/db');

function notifyUser(userId, kelasId, judul, isi) {
  db.prepare('INSERT INTO notifikasi (user_id, kelas_id, judul, isi) VALUES (?,?,?,?)')
    .run(userId, kelasId || null, judul, isi || null);
}

// Kirim ke semua anggota kelas (+mentor bila sertakanMentor), kecuali skipUserId.
function notifyKelas(kelasId, judul, isi, skipUserId = null, sertakanMentor = false) {
  const member = db.prepare('SELECT siswa_id FROM kelas_member WHERE kelas_id = ?').all(kelasId);
  const tambah = db.prepare('INSERT INTO notifikasi (user_id, kelas_id, judul, isi) VALUES (?,?,?,?)');
  for (const m of member) {
    if (skipUserId && m.siswa_id === skipUserId) continue;
    tambah.run(m.siswa_id, kelasId, judul, isi || null);
  }
  if (sertakanMentor) {
    const k = db.prepare('SELECT mentor_id FROM kelas WHERE id = ?').get(kelasId);
    if (k && k.mentor_id !== skipUserId) tambah.run(k.mentor_id, kelasId, judul, isi || null);
  }
}

module.exports = { notifyUser, notifyKelas, catatAktivitas };

// Jejak kontribusi harian (untuk grid kontribusi dashboard siswa).
// jenis: 'login' | 'tugas' | 'kuis' | 'diskusi'
function catatAktivitas(userId, jenis) {
  try {
    db.prepare('INSERT INTO aktivitas (user_id, jenis) VALUES (?,?)').run(userId, jenis);
  } catch {}
}
