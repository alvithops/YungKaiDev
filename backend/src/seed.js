// Seed awal: HANYA pengaturan default (tanpa akun demo).
// Pengguna langsung daftar sendiri di halaman Register (mentor/siswa).
const db = require('./config/db');

const setDefault = db.prepare('INSERT OR IGNORE INTO settings (kunci, nilai) VALUES (?,?)');
setDefault.run('sambutan', 'Selamat datang di E-Learning! Belajar kapan saja, di mana saja. 🎓');
setDefault.run('kontak_wa', 'https://wa.me/6289603294473');
setDefault.run('kontak_ig', 'https://www.instagram.com/alvithopsipayung?igsi=c3R5bW5wZXg4ZW94');
setDefault.run('kontak_email', 'mailto:alvithops@gmail.com');
setDefault.run('kontak_github', 'https://github.com/alvithops');

console.log('Seed OK: pengaturan default tersimpan.');
console.log('Silakan buka http://localhost:3000 lalu Daftar sebagai Mentor/Siswa.');
