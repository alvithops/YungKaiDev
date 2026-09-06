# 09 - Tutorial Menjalankan Web E-Learning

## 1. Syarat
- Node.js v22+ (`node -v` untuk cek; v24 disarankan — tanpa ini server tidak jalan).
- Browser modern (Chrome/Edge/Firefox).
- Tidak perlu MySQL / XAMPP — database SQLite otomatis dibuat.

## 2. Menjalankan (3 perintah)

```bash
cd /home/payung/pkl-web/backend
npm install     # sekali saja: unduh express, jsonwebtoken, bcryptjs, multer, cors, dotenv
npm run seed    # sekali saja: buat akun demo + kelas contoh
npm start       # jalankan server
```

Tunggu tulisan: `E-Learning jalan di http://localhost:3000`
Buka browser ke **http://localhost:3000**.

> Frontend + backend + file upload dilayani 1 server yang sama, jadi tidak
> perlu Live Server / membuka file HTML manual.

## 3. Login pertama (akun demo)

| Peran  | Email            | Password  |
|--------|------------------|-----------|
| Mentor | `mentor@demo.id` | `demo123` |
| Siswa  | `siswa@demo.id`  | `demo123` |

Kode kelas demo: **`WEB-7X2K9A`**

## 4. Simulasi 2 peran (2 tab, realtime)

1. Tab 1: login **mentor** → Dashboard → **+ Buat Kelas** → salin kode baru.
2. Tab 2 (atau mode samaran): register/login **siswa** → **Gabung via Kode** → tempel kode.
3. Tab 1: buka kelas → **+ Tambah Materi / Buat Tugas / Buat Kuis + soal / 📢 Pengumuman**.
4. Tab 2: lonceng 🔔 berbunyi (angka naik) **tanpa refresh** — itulah
   `BroadcastChannel` + polling bekerja. Buka Tugas → kumpul file atau tulis kode.
5. Tab 1: Tugas → **Lihat Pengumpulan** → unduh file / lihat kode → isi nilai → Simpan.
6. Tab 2: nilai + feedback langsung muncul; cek **🎓 Transkrip** → **Unduh .txt**.
7. Tab 1: Anggota → **👁 Pantau** (lihat tampilan siswa) → **Kick/Ban** → Tab 2
   otomatis 403; Tab 2 join lagi → permintaan terkirim; Tab 1 setujui di
   "Permintaan akses kembali".

## 5. Menghentikan server
- Di terminal server: tekan `Ctrl+C`.
- Jalankan lagi kapan saja: `npm start` (data tidak hilang — tersimpan di
  `backend/data/elearning.db` dan `backend/uploads/`).

## 6. Reset dari nol
```bash
rm backend/data/elearning.db* backend/uploads/materi/* backend/uploads/tugas/*
npm run seed
```

## 7. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `EADDRINUSE :3000` | Port dipakai server lama. Cari PID: `ss -ltnp \| grep 3000` lalu `kill <PID>`, start lagi. |
| `Tidak dapat menghubungi server` di browser | Backend belum `npm start`, atau buka HTML via `file://` di PC lain — gunakan `http://<IP>:3000`. |
| Upload ditolak | Max 10MB; ekstensi di luar daftar (pdf/doc/zip/jpg/png/txt/js/py/php/java/html/css/dll) ditolak. |
| `Sesi habis` | Token 7 hari kedaluwarsa / terhapus → login ulang. |
| Lupa JWT_SECRET | Isi `.env` dari `.env.example` sebelum `npm start` pertama. |
| Demo di HP (1 WiFi) | Di laptop: `npm start`; di HP buka `http://<IP-laptop>:3000` (cek IP via `hostname -I`). |

## 8. Menjalankan untuk 1 mentor + 1000 siswa bersamaan

```bash
npm run cluster   # mode multi-core (ganti npm start bila user membludak)
```

- JWT stateless → tiap siswa/mentor mandiri, tidak saling mengganggu.
- Akses LAN: di perangkat lain buka `http://<IP-laptop>:3000` (1 WiFi, cukup browser).
- Bukti uji: `node loadtest.js --users 1000 --putaran 1 --gelombang 100`
  (hasil: 6100 request, 100% sukses, p95 88ms — lihat `docs/11-skala-konkurensi.md`).

## 9. Struktur penting
```
backend/server.js            # 1 perintah jalan (API + frontend + upload)
backend/data/elearning.db    # database (jangan dihapus saat dipakai)
backend/uploads/materi|tugas # file fisik (path-nya tercatat di DB)
frontend/pages/*.html        # halaman (login, dashboard, kelas, transkrip)
frontend/js/realtime.js      # BroadcastChannel lintas-tab
docs/*.md                    # bahan laporan PKL
```
