# 04 - Sitemap & Alur Pengguna

## Sitemap Frontend

```
/
├── index.html (landing + login/register)
├── pages/
│   ├── auth-login.html
│   ├── auth-register.html
│   ├── dashboard-mentor.html
│   ├── dashboard-siswa.html
│   ├── kelas-detail.html?id=... (isi: tab Materi | Tugas | Kuis | Diskusi | Anggota)
│   ├── materi-detail.html?id=...
│   ├── tugas-detail.html?id=... (siswa: form upload/kode; mentor: daftar pengumpulan)
│   ├── kuis-detail.html?id=... (kerjakan / kelola soal)
│   └── gabung-kelas.html (form input kode)
```

## Flow Join Kelas via Kode
```mermaid
sequenceDiagram
  participant S as Siswa
  participant F as Frontend
  participant B as Backend
  participant DB as MySQL
  S->>F: Input kode_kelas
  F->>B: POST /api/kelas/join {kode_kelas}
  B->>DB: SELECT kelas WHERE kode=?
  alt kode valid
    B->>DB: INSERT kelas_member (cek duplikat)
    B-->>F: 200 {kelas}
    F-->>S: Redirect ke kelas-detail
  else kode salah
    B-->>F: 404 Kode tidak ditemukan
    F-->>S: Tampilkan error
  end
```

## Flow Kumpul Tugas (File / Kode)
```mermaid
sequenceDiagram
  participant S as Siswa
  participant F as Frontend
  participant B as Backend
  participant FS as Folder uploads/tugas
  participant DB as MySQL
  S->>F: Pilih mode File/Kode + Submit
  F->>B: POST /api/tugas/:id/kumpul (multipart atau JSON)
  B->>B: Validasi JWT + keanggotaan kelas + deadline
  alt mode file
    B->>FS: Simpan file via Multer
  else mode code
    B->>FS: Simpan .txt dari kode_program
  end
  B->>DB: UPSERT pengumpulan_tugas
  B-->>F: 200 Terkumpul
```

## Flow Nilai Otomatis Kuis PG
1. Siswa submit jawaban `{soal_id: 'A'}`.
2. Backend ambil kunci dari `soal`, hitung benar/total*100.
3. Simpan ke `hasil_kuis`. Kembalikan skor langsung.

## Navigasi Mentor vs Siswa
- Mentor setelah login → `dashboard-mentor.html`: tombol Buat Kelas, daftar kelas, badge "X tugas belum dinilai".
- Siswa setelah login → `dashboard-siswa.html`: tombol Gabung Kelas (input kode), daftar kelas, tugas deadline < 3 hari.
