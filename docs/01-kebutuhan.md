# 01 - Kebutuhan Fungsional & Non-Fungsional

## A. Fungsional

### Auth & User
- F01: Register (nama, email, password, role: mentor/siswa).
- F02: Login, dapat JWT token.
- F03: Lihat/edit profil.
- F04: Middleware cek role untuk endpoint mentor-only.

### Kelas (Code-based)
- F05: Mentor buat kelas (nama, deskripsi) → auto-generate `kode_kelas` unik.
- F06: Mentor lihat daftar kelas yang dia buat, lihat anggota, reset/regenerate kode, hapus kelas.
- F07: Siswa join kelas dengan `kode_kelas`.
- F08: Siswa lihat daftar kelas yang diikuti. Keluar kelas.

### Materi / Modul
- F09: Mentor CRUD materi per kelas (judul, deskripsi, file opsional, link video opsional, urutan).
- F10: Siswa lihat daftar materi per kelas (real-time via fetch).
- F11: File materi tersimpan di `backend/uploads/materi/`.

### Tugas & Pengumpulan
- F12: Mentor CRUD tugas per kelas (judul, deskripsi, deadline, file lampiran opsional).
- F13: Siswa lihat daftar tugas + status (belum/sudah dinilai).
- F14: Siswa kumpul tugas 2 cara:
  - a) Upload file → tersimpan di `backend/uploads/tugas/`, path tercatat di DB.
  - b) Submit kode program (pilih bahasa, paste kode) → tersimpan sebagai file `.txt` + kolom `kode_program` di DB.
- F15: Siswa bisa kumpul ulang sebelum dinilai (versi terbaru menimpa / revisi).
- F16: Mentor lihat daftar pengumpulan per tugas, download file, lihat kode, beri nilai + feedback.
- F17: Siswa lihat nilai + feedback tugasnya.

### Kuis / Ujian
- F18: Mentor buat kuis per kelas (judul, durasi, deadline) + tambah soal PG (pertanyaan, opsi A-D, kunci).
- F19: Siswa kerjakan kuis (satu kali percobaan MVP), jawaban tersimpan, nilai otomatis.
- F20: Mentor & siswa lihat hasil kuis.

### Diskusi
- F21: Thread diskusi per kelas (atau per materi). Siswa/mentor bisa posting + balas.
- F22: Hapus postingan sendiri / oleh mentor pemilik kelas.

### Dashboard
- F23: Dashboard mentor: total kelas, total siswa, tugas belum dinilai, kuis aktif.
- F24: Dashboard siswa: kelas diikuti, tugas deadline dekat, nilai terakhir.

## B. Non-Fungsional
- NF01: Frontend responsif (HP + laptop), pakai Tailwind.
- NF02: API response JSON konsisten: `{ success, message, data }`.
- NF03: Password di-hash bcrypt, auth JWT 7 hari.
- NF04: Validasi upload: max 5MB per file, ekstensi: pdf, doc, docx, xls, xlsx, csv, ppt, pptx, odt, ods, odp, rtf, zip, rar, jpg, png, txt, md, js, py, php, java, html, css.
- NF05: MySQL dengan foreign key + index pada `kode_kelas`, `kelas_id`.
- NF06: Struktur kode MVC sederhana agar mudah dijelaskan di laporan.
