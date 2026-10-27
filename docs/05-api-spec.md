# 05 - Spesifikasi API (REST)

Base URL: `http://localhost:3000/api`
Auth: `Authorization: Bearer <JWT>` kecuali login/register.
Format: `{ success: bool, message: string, data: any }`

## Auth (terpisah per peran + keamanan terpusat `utils/keamanan.js`)
- `POST /auth/register` {nama, username (wajib siswa), email, password, role} → {token, user}
- `POST /auth/login-siswa` {username, password} → tolak akun mentor (403)
- `POST /auth/login-mentor` {email, password} → tolak akun siswa (403), tanpa registrasi
- `POST /auth/login` (lama, kompatibel) | `GET /auth/me` (JWT) → user + banned_dari
- `DELETE /auth/me` (JWT) → hapus akun sendiri
- `POST /auth/lupa-password` (siswa, tanpa login) {username, email, password_baru} → reset mandiri bila pasangan cocok (rate-limit); dipicu UI setelah 3x gagal di login-siswa
- Rate-limit: 5x gagal/15 mnt (429). Email terblokir permanent: login & daftar ditolak.
- `PUT /users/:id/reset-password` (mentor, siswa di kelasnya) {password_baru} — ganti lupa password tanpa SMTP

## Kelas
- `POST /kelas` (mentor) {nama_kelas, deskripsi} → {id, kode_kelas}
- `GET /kelas` (JWT) → list kelas (mentor: yang dibuat; siswa: yang diikuti)
- `GET /kelas/:id` (anggota/mentor) → detail + anggota + materi/tugas/kuis ringkas
- `POST /kelas/join` (siswa) {kode_kelas} → gabung
- `POST /kelas/:id/regenerate` (mentor) → kode baru
- `DELETE /kelas/:id` (mentor pemilik) → hapus kelas + CASCADE semua data (materi, tugas, pengumpulan, kuis, diskusi, anggota) + hapus file fisik di uploads/
- `DELETE /kelas/:id/keluar` (siswa) → keluar
- `GET /kelas/:id/anggota` (mentor) → daftar siswa

## Materi
> Aturan akses: daftar modul/tugas/kuis/soal hanya untuk siswa berstatus `aktif`
> (yang sedang keluar kelas mendapat 403 + arahan masuk kembali). Mentor bebas.
> Semua modul/tugas/kuis punya `pertemuan` 1–14 (default 1, otomatis dijepit).
- `GET /kelas/:id/materi` → list
- `POST /kelas/:id/materi` (mentor, multipart) {judul, deskripsi, link_video, file} → materi
- `PUT /materi/:materiId` (mentor) → update metadata + opsional ganti file (multipart `file` / `hapus_file=1`)
- `DELETE /materi/:materiId` (mentor) → hapus (+ hapus file)
- Unduhan terkunci: `GET /api/file?f=/uploads/...&token=JWT` (cek hak akses; /uploads tak lagi publik)

## Tugas & Pengumpulan
- `GET /kelas/:id/tugas` → list + status kumpul/nilai (untuk siswa)
- `POST /kelas/:id/tugas` (mentor) → buat tugas
- `PUT /tugas/:tugasId` (mentor), `DELETE /tugas/:tugasId` (mentor)
- `POST /tugas/:tugasId/kumpul` (siswa):
  - file: `multipart/form-data { file }`
  - code: `JSON { tipe:'code', bahasa, kode_program }`
- `GET /tugas/:tugasId/pengumpulan` (mentor) → semua submission
- `PUT /pengumpulan/:id/nilai` (mentor) {nilai, feedback} → dinilai
- `GET /tugas/:tugasId/nilai-saya` (siswa) → nilai + feedback

## Kuis (PG + esai, timer server, soal diacak)
- `GET /kelas/:id/kuis` → list
- `POST /kelas/:id/kuis` (mentor) {judul, deskripsi, durasi_menit, deadline, pertemuan}
- `PUT /kuis/:kuisId`, `DELETE /kuis/:kuisId` (mentor)
- `POST /kuis/:kuisId/soal` (mentor) {pertanyaan, opsi_a..d, kunci, tipe: pg|essay, bobot, kunci_esai (kata kunci esai untuk auto-nilai semantik ≥60%)}
- `PUT /kuis/soal/:soalId`, `DELETE /kuis/soal/:soalId` (mentor, mis. ubah kunci)
- `PUT /kuis/soal/:soalId`, `DELETE /kuis/soal/:soalId` (mentor, mis. ubah kunci)
- `GET /kuis/:kuisId/soal` (siswa: acak + tanpa kunci; mentor: berurutan + kunci)
- `POST /kuis/:kuisId/mulai` (siswa) → catat mulai_pada
- `POST /kuis/:kuisId/submit` (siswa, wajib mulai; ditolak bila lewat durasi+60 dtk) → PG otomatis, esai menunggu
- `PUT /kuis/hasil/:hasilId/nilai` (mentor) {skor, feedback} → nilai final esai
- `GET /kuis/:kuisId/hasil` (mentor: semua; siswa: miliknya)
- List mendukung `?q=&limit=&offset=` (juga materi/tugas/kelas/notifikasi/pengumuman)

## Diskusi
- `GET /kelas/:id/diskusi?materi_id=` → thread (parent + balasan)
- `POST /kelas/:id/diskusi` {isi, materi_id?, parent_id?}
- `DELETE /diskusi/:diskusiId` (pemilik/mentor)

## Dashboard
- `GET /dashboard/mentor` → {total_kelas, total_siswa, tugas_belum_dinilai, kuis_aktif}
- `GET /dashboard/siswa` → {total_kelas, tugas_mendatang[], nilai_terakhir[]}

## Notifikasi (dari referensi, otomatis via utils/notifikasi.js)
- `GET /notifikasi` → inbox milikku (belum dibaca dulu, max 30)
- `GET /notifikasi/belum-baca` → {belum_baca}
- `PUT /notifikasi/:id/baca`, `PUT /notifikasi/baca-semua`
- `POST /kelas/:id/pengumuman` (mentor) {isi} → terkirim ke semua anggota
- Otomatis: materi/tugas/kuis baru → anggota; nilai tersimpan → siswa ybs;
  siswa daftar → semua mentor; login pertama siswa → semua mentor (sekali saja);
  pemeriksa terjadwal tiap 5 mnt: tugas lewat deadline belum dikumpul → mentor (sekali per kasus).

## Moderasi: ban + permintaan akses (dari referensi)
- `GET /kelas/:id/moderasi` (mentor) → {banned[], pending[]}
- `POST /kelas/:id/ban` (mentor) {siswa_id, alasan} → kick + blokir + notif ke siswa
- `DELETE /kelas/:id/ban/:siswaId` (mentor) → buka blokir
- `PUT /permintaan-akses/:reqId` (mentor) {keputusan:'setuju'|'tolak'}
- Ban langsung tanpa alasan; login oleh akun ter-ban otomatis jadi permintaan pending + notif harian ke mentor.
- `POST /blokir-permanen` (mentor) {siswa_id} → hapus akun + file + kunci email/username selamanya (login & daftar ditolak).
- `GET /blokir-permanen`, `DELETE /blokir-permanen/:id` (buka blokir),
  `DELETE /blokir-permanen` (bersihkan seluruh riwayat; email bisa dipakai lagi).
- `DELETE /kelas/:id/keluar` (siswa) → status `keluar`, data TIDAK dihapus
- `POST /kelas/:id/masuk` (siswa) → masuk kembali TANPA kode (khusus riwayat anggota)
- Join via kode saat status keluar → reaktivasi otomatis (kode hanya untuk awal)
- Aksi (kumpul/kuis/diskusi) wajib status `aktif`, baca materi tetap boleh
- Dashboard mentor: total = siswa terdaftar, online = last_seen < 5 mnt, grafik = pendaftaran/hari

## Pengaturan, pengumuman global, pantau, rekap, aktivitas
- `GET /pengaturan` → {sambutan, kontak_wa, kontak_ig, kontak_email}
- `PUT /pengaturan` (mentor) {kunci, nilai}
- `GET /pengumuman` → 20 terbaru; `POST /pengumuman` (mentor) {judul, isi} → inbox semua siswa; `DELETE /pengumuman/:id` (mentor)
- `GET /pantau` (mentor) → {kelas[], siswa[{kelas[]}], banned[], pending[]}
- `GET /pantau/siswa/:id?kelas=` (mentor, read-only) → progres P1–14 (modul dibaca, status/nilai/file tugas, skor kuis)
- `POST /materi/:id/baca` (siswa) → jejak modul dibaca (tanpa respons berisik)
- `POST /materi/:id/baca` (siswa) → jejak modul dibaca (tanpa respons berisik)
- `GET /kelas/:id/rekap` (mentor) → {kelas, tugas[], kuis[], siswa[{nilai, rata2, nilai_kuis, rata_kuis, rata_total, bulanan}]} (nilai kuis masuk otomatis real-time)
- `GET /aktivitas/ringkas` → {tgl: jumlah} 70 hari terakhir
- `GET /dashboard/mentor/grafik` → [{tanggal, pendaftar}] 14 hari
- Login salah 5x → 429 (rate-limit 15 menit).

## Kode Status
- 200 OK, 201 Created, 400 validasi, 401 belum login, 403 bukan hak akses, 404 tidak ketemu, 409 duplikat (sudah join/sudah submit).
