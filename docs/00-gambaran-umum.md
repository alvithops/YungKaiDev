# 00 - Gambaran Umum Sistem

## 1. Judul
Sistem Informasi E-Learning Berbasis Web (Frontend + Backend).

## 2. Latar Belakang
Pembelajaran di sekolah/kampus masih mengandalkan grup chat untuk sebar materi dan kumpul tugas. Akibatnya: file tercecer, penilaian manual, tidak ada rekap nilai, tidak ada wadah kuis/diskusi terpusat.

## 3. Tujuan
1. Wadah materi, tugas, kuis per kelas yang terstruktur.
2. Mekanisme gabung kelas cepat via **kode kelas** dari mentor.
3. Pengumpulan tugas ganda: **upload file** (pdf/zip/doc) + **code submission** (paste kode program) yang tersimpan di server + database.
4. Penilaian transparan oleh mentor.
5. Bahan laporan PKL yang lengkap (UML, ERD, API spec).

## 4. Pengguna
- **Mentor / Admin**: buat kelas, generate kode, CRUD materi/tugas/kuis, nilai tugas, balas diskusi.
- **Siswa**: join kelas via kode, lihat materi, kumpul tugas, kerjakan kuis, diskusi.

## 5. Batasan MVP (tahap 1)
- Auth: register/login JWT, role `mentor` dan `siswa`.
- 1 siswa bisa gabung banyak kelas, 1 kelas punya banyak siswa.
- Upload max 10MB, tipe dibatasi.
- Kuis: pilihan ganda saja dulu (essay tahap 2).
- Real-time = Fetch + auto-refresh 10 detik (WebSocket opsional tahap 2).
- Tidak ada pembayaran, tidak ada video conference.

## 6. Alur Besar
```
Mentor: Register/Login → Buat Kelas → Dapat Kode → Tambah Materi/Tugas/Kuis
Siswa: Register/Login → Input Kode Kelas → Gabung → Lihat Materi → Kumpul Tugas / Kerjakan Kuis → Lihat Nilai
Mentor: Lihat Pengumpulan → Beri Nilai + Feedback
```
