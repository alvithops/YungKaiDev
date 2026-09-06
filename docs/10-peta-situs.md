# 10 - Peta Situs (sesuai struktur program)

```
HALAMAN UTAMA (index.html) / PILIH MASUK (auth-login.html)
│   ├── Login Siswa (login-siswa.html): username + password → dashboard-siswa
│   └── Login Mentor (login-mentor.html): email + password, eksklusif → dashboard-mentor
│
├── MENTOR
│   ├── Dashboard (dashboard-mentor.html)
│   │     Grafik pendaftaran 14 hari, total siswa aktif, statistik,
│   │     teks sambutan (bisa diubah) ............ GET /dashboard/mentor[+grafik]
│   ├── Class (class-mentor.html → kelola di kelas-mentor.html)
│   │     CRUD kelas + kode, modul teks/file, tugas,
│   │     lihat + nilai tugas siswa .............. /kelas, /materi, /tugas
│   ├── Transkrip (transkrip-mentor.html)
│   │     Pilih kelas → matriks siswa × tugas (=pertemuan),
│   │     beri nilai inline, indikator warna,
│   │     rekap rata-rata bulanan ................ GET /kelas/:id/rekap
│   ├── Announcement (announcement.html)
│   │     Buat + hapus pengumuman sistem → masuk
│   │     inbox semua siswa ...................... /pengumuman
│   └── Pantau Siswa (pantau.html → pantau-siswa.html read-only per siswa)
│         Live view tampilan siswa (?view=siswa),
│         kick/ban, buka blokir,
│         setujui/tolak akses kembali ............ /pantau, /kelas/:id/ban
│
└── SISWA
    ├── Pendaftaran / Masuk (auth-register.html + username, login-siswa.html)
    │     Validasi email + password, rate-limit 5x/15 mnt,
    │     info banned, catat kontribusi harian .... /auth/*
    ├── Dashboard (dashboard-siswa.html)
    │     Sambutan, notifikasi 🔔, statistik kelas,
    │     grid kontribusi 10 minggu, pengumuman ... /aktivitas/ringkas
    ├── Class (class-siswa.html → detail kelas-siswa.html)
    │     Input kode gabung, buka pertemuan,
    │     baca modul / unduh file ................ /kelas/join
    ├── Tugas Saya (tugas-saya.html → kumpul di kelas-siswa.html)
    │     Daftar + status semua tugas,
    │     kirim jawaban teks/kode atau file ....... /tugas/:id/kumpul
    └── Transkrip & Kontak (transkrip.html)
          Nilai + indikator warna, unduh .txt,
          tautan WA/IG/Email (diatur mentor) ..... /pengaturan
```

## Keamanan login: `backend/src/utils/keamanan.js` (1 file terpusat)
- `hashPassword` / `cocokPassword` (bcrypt 10 rounds — password **tetap di-hash**,
  tidak pernah plaintext; yang bisa membaca DB pun tak bisa melihat password).
- `buatToken` / `cekToken` (JWT 7 hari).
- `bolehLogin` / `catatGagal` / `catatSukses` (rate-limit: max 5 gagal / 15 mnt).
- `bersih` / `emailValid` / `kuatPassword` (validasi + sanitasi input).
- Dipakai oleh `routes/auth.js` (register/login) dan `middleware/auth.js`
  (verifyToken tiap request).
