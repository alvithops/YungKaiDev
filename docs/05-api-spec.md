# 05 - Spesifikasi API (REST)

Base URL: `http://localhost:3000/api`
Auth: `Authorization: Bearer <JWT>` kecuali login/register.
Format: `{ success: bool, message: string, data: any }`

## Auth
- `POST /auth/register` {nama, email, password, role} → {token, user}
- `POST /auth/login` {email, password} → {token, user}
- `GET /auth/me` (JWT) → user

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
- `PUT /materi/:materiId` (mentor) → update
- `DELETE /materi/:materiId` (mentor) → hapus (+ hapus file)

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

## Kuis
- `GET /kelas/:id/kuis` → list
- `POST /kelas/:id/kuis` (mentor) {judul, deskripsi, durasi_menit, deadline}
- `POST /kuis/:kuisId/soal` (mentor) {pertanyaan, opsi_a..d, kunci}
- `PUT /soal/:soalId`, `DELETE /soal/:soalId` (mentor)
- `GET /kuis/:kuisId/soal` (siswa: tanpa kunci; mentor: dengan kunci)
- `POST /kuis/:kuisId/submit` (siswa) {jawaban: {soalId: 'A'}} → {skor}
- `GET /kuis/:kuisId/hasil` (mentor: semua; siswa: miliknya)

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
- `GET /blokir-permanen`, `DELETE /blokir-permanen/:id` (buka blokir).
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
- `GET /kelas/:id/rekap` (mentor) → {kelas, tugas[], siswa[{nilai{tugasId:{p_id,nilai,status}}, rata2, bulanan}]}
- `GET /aktivitas/ringkas` → {tgl: jumlah} 70 hari terakhir
- `GET /dashboard/mentor/grafik` → [{tanggal, pendaftar}] 14 hari
- Login salah 5x → 429 (rate-limit 15 menit).

## Kode Status
- 200 OK, 201 Created, 400 validasi, 401 belum login, 403 bukan hak akses, 404 tidak ketemu, 409 duplikat (sudah join/sudah submit).
