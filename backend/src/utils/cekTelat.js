// Pemeriksa tugas TELAT: siswa aktif yang lewat deadline tanpa mengumpulkan.
// Dijalankan berkala oleh server.js → masuk lonceng 🔔 mentor (sekali per kasus).
const db = require('../config/db');
const { notifySekali } = require('./notifikasi');

function cekTugasTelat() {
  const rows = db.prepare(`
    SELECT t.id AS tugas_id, t.judul, t.deadline, t.pertemuan,
           k.id AS kelas_id, k.nama_kelas, k.mentor_id,
           u.id AS siswa_id, u.nama AS siswa_nama
    FROM tugas t
    JOIN kelas k ON k.id = t.kelas_id
    JOIN kelas_member km ON km.kelas_id = k.id AND km.status = 'aktif'
    JOIN users u ON u.id = km.siswa_id
    WHERE t.deadline IS NOT NULL AND t.deadline < CURRENT_TIMESTAMP
      AND NOT EXISTS (SELECT 1 FROM pengumpulan_tugas p WHERE p.tugas_id = t.id AND p.siswa_id = u.id)
  `).all();
  let terkirim = 0;
  for (const r of rows) {
    const ok = notifySekali(r.mentor_id, r.kelas_id,
      `⏰ Telat: ${r.siswa_nama} belum kumpul`,
      `${r.judul} · ${r.nama_kelas} · Pertemuan ${r.pertemuan || 1} · deadline ${r.deadline}`,
      `telat:${r.tugas_id}:${r.siswa_id}:ke-${r.mentor_id}`);
    if (ok) terkirim++;
  }
  return terkirim;
}

module.exports = { cekTugasTelat };
