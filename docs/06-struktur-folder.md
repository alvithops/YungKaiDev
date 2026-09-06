# 06 - Struktur Folder & Rencana Implementasi

## Struktur Final
```
pkl-web/
├── README.md
├── docs/*.md
├── database/schema.sql
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/auth.js (verifyToken, requireRole)
│   │   ├── middleware/upload.js (multer materi & tugas)
│   │   ├── routes/auth.js, kelas.js, materi.js, tugas.js, kuis.js, diskusi.js, dashboard.js
│   │   └── controllers/*.js
│   └── uploads/
│       ├── materi/
│       └── tugas/ (+ .gitkeep)
└── frontend/
    ├── index.html
    ├── css/style.css (atau tailwind CDN)
    ├── js/config.js (API_BASE_URL), js/auth.js, js/api.js
    └── pages/*.html
```

## Tahapan Coding (untuk laporan PKL)
1. **DB**: import `schema.sql`, tes relasi.
2. **Backend Auth + Kelas** (paling penting: join via kode).
3. **Materi + Tugas + Upload** (multer, simpan path).
4. **Penilaian** (nilai + feedback).
5. **Kuis PG + auto-nilai**.
6. **Diskusi + Dashboard**.
7. **Frontend**: auth → dashboard → kelas-detail → tugas/kuis.
8. **Testing**: Postman untuk API, uji upload 10MB, uji kode salah, uji akses role.

## Konvensi
- Nama file upload: sanitasi + prefix timestamp untuk hindari tabrakan.
- JWT payload: `{ id, role }`, expire 7d.
- Password: bcrypt 10 rounds.
- Validasi di backend selalu (frontend hanya UX).

## Langkah Berikutnya (tinggal pilih)
- A: Saya buatkan `schema.sql` + `server.js` + contoh halaman login/dashboard.
- B: Lengkapkan 1 modul penuh (Auth + Kelas + Join via kode) end-to-end.
- C: Buatkan slide/diagram UML siap tempel ke laporan.
