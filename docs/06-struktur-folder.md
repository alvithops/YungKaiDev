# 06 - Struktur Folder & Rencana Implementasi

## Struktur Final (terkini)
```
pkl-web/
├── README.md
├── docs/*.md (00–11)
├── database/schema.sql  # skema MySQL acuan laporan
├── backend/
│   ├── package.json (start, cluster, seed, loadtest, test)
│   ├── server.js (API + frontend statis + /api/file terkunci + cek telat)
│   ├── loadtest.js (uji 2000 user) | tests/uji.py (baterai 50 kasus, `npm test`)
│   ├── src/
│   │   ├── config/db.js (SQLite + migrasi kolom)
│   │   ├── middleware/auth.js (JWT + last_seen) + upload.js (5MB, ppt/xls/pdf/dll)
│   │   ├── routes/auth.js (register/login-siswa/login-mentor/me + hapus akun)
│   │   ├── routes/kelas.js, materi.js (ganti file), tugas.js, kuis.js (esai/timer),
│   │   │         ekstra.js (notif/pengumuman/ban/permanent/reset-pw/pantau/rekap),
│   │   │         diskusi-dashboard.js (diskusi + dashboard + grafik)
│   │   └── utils/keamanan.js, kode.js, notifikasi.js, paginasi.js, cekTelat.js
│   ├── data/elearning.db (SQLite) | uploads/materi|tugas (file fisik)
└── frontend/
    ├── index.html (landing Yungkai) + fotoku.jpeg + mentor.webp
    ├── css/neo-brutal.css
    ├── js/config, api (+apiFile), auth, layout, realtime, notifikasi,
    │   dashboard-mentor/siswa, kelas-mentor/siswa, (+kelas-detail.js dihapus)
    └── pages/*.html (login-siswa/mentor, dashboards, class-*, kelas-*,
        tugas-saya, transkrip ×2, announcement, pantau ×2, gabung-kelas)
```

## Tahapan Coding (untuk laporan PKL)
1. **DB**: import `schema.sql`, tes relasi.
2. **Backend Auth + Kelas** (paling penting: join via kode).
3. **Materi + Tugas + Upload** (multer, simpan path).
4. **Penilaian** (nilai + feedback).
5. **Kuis PG + auto-nilai**.
6. **Diskusi + Dashboard**.
7. **Frontend**: auth terpisah → dashboard → class → kelas per peran.
8. **Testing**: `npm test` (50 kasus otomatis), `node loadtest.js` (2000 user), uji upload 5MB, uji peran.

## Konvensi
- Nama file upload: sanitasi + prefix timestamp untuk hindari tabrakan.
- JWT payload: `{ id, role }`, expire 7d.
- Password: bcrypt 10 rounds.
- Validasi di backend selalu (frontend hanya UX).

## Langkah Berikutnya (tinggal pilih)
- A: Saya buatkan `schema.sql` + `server.js` + contoh halaman login/dashboard.
- B: Lengkapkan 1 modul penuh (Auth + Kelas + Join via kode) end-to-end.
- C: Buatkan slide/diagram UML siap tempel ke laporan.
