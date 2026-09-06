// Seed akun demo: mentor@demo.id / siswa@demo.id (password: demo123) + 1 kelas contoh.
const bcrypt = require('bcryptjs');
const db = require('./config/db');

function upsertUser(nama, email, password, role) {
  const ada = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (ada) return ada.id;
  const info = db.prepare('INSERT INTO users (nama, email, password_hash, role) VALUES (?,?,?,?)')
    .run(nama, email, bcrypt.hashSync(password, 10), role);
  return info.lastInsertRowid;
}

const mentorId = upsertUser('Bu Rina (Mentor)', 'mentor@demo.id', 'demo123', 'mentor');
const siswaId = upsertUser('Sari (Siswa)', 'siswa@demo.id', 'demo123', 'siswa');

let kelas = db.prepare('SELECT * FROM kelas WHERE mentor_id = ?').get(mentorId);
if (!kelas) {
  const info = db.prepare('INSERT INTO kelas (mentor_id, nama_kelas, deskripsi, kode_kelas) VALUES (?,?,?,?)')
    .run(mentorId, 'Pemrograman Web', 'HTML, CSS, JS + Fetch API (kelas demo)', 'WEB-7X2K9A');
  kelas = db.prepare('SELECT * FROM kelas WHERE id = ?').get(info.lastInsertRowid);
}
if (!db.prepare('SELECT id FROM kelas_member WHERE kelas_id = ? AND siswa_id = ?').get(kelas.id, siswaId)) {
  db.prepare('INSERT INTO kelas_member (kelas_id, siswa_id) VALUES (?,?)').run(kelas.id, siswaId);
}
if (!db.prepare('SELECT id FROM materi WHERE kelas_id = ?').get(kelas.id)) {
  db.prepare('INSERT INTO materi (kelas_id, judul, deskripsi, urutan) VALUES (?,?,?,?)')
    .run(kelas.id, 'HTML Dasar', 'Struktur dokumen, tag, form.', 1);
  db.prepare('INSERT INTO materi (kelas_id, judul, deskripsi, urutan) VALUES (?,?,?,?)')
    .run(kelas.id, 'JS Fetch API', 'GET/POST ke REST API dengan fetch + JWT.', 2);
}
if (!db.prepare('SELECT id FROM tugas WHERE kelas_id = ?').get(kelas.id)) {
  db.prepare('INSERT INTO tugas (kelas_id, judul, deskripsi) VALUES (?,?,?)')
    .run(kelas.id, 'Tugas 1: Halaman Profil', 'Buat halaman profil dengan HTML+CSS, upload zip atau paste kode.');
}
if (!db.prepare('SELECT id FROM kuis WHERE kelas_id = ?').get(kelas.id)) {
  const q = db.prepare('INSERT INTO kuis (kelas_id, judul, deskripsi, durasi_menit) VALUES (?,?,?,?)')
    .run(kelas.id, 'Kuis HTML Dasar', '10 menit, pilihan ganda.', 10);
  const tambah = db.prepare('INSERT INTO soal (kuis_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, kunci) VALUES (?,?,?,?,?,?,?)');
  tambah.run(q.lastInsertRowid, 'Tag HTML untuk paragraf?', '<p>', '<div>', '<span>', '<h1>', 'A');
  tambah.run(q.lastInsertRowid, 'Atribut untuk ID elemen?', 'class', 'id', 'name', 'src', 'B');
}

const setDefault = db.prepare('INSERT OR IGNORE INTO settings (kunci, nilai) VALUES (?,?)');
setDefault.run('sambutan', 'Selamat datang di E-Learning! Belajar kapan saja, di mana saja. 🎓');
setDefault.run('kontak_wa', 'https://wa.me/6281234567890');
setDefault.run('kontak_ig', 'https://instagram.com/sekolah');
setDefault.run('kontak_email', 'mailto:info@sekolah.id');

console.log('Seed OK:');
console.log('- mentor@demo.id / demo123 (kode kelas:', kelas.kode_kelas + ')');
console.log('- siswa@demo.id / demo123');
