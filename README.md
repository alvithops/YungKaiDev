# E-Learning Sekolah/Kampus (PKL-Web)

Platform pembelajaran online dengan 2 peran utama: **Mentor/Admin** dan **Siswa**.

## Konsep Singkat
- Mentor membuat **Kelas** → sistem generarate **Kode Kelas** (misal: `WEB-7X2K9A`).
- Siswa gabung kelas pakai **Kode Kelas**.
- Mentor mengelola **Materi, Tugas, Kuis** per kelas (CRUD).
- Siswa melihat materi real-time, mengumpulkan tugas via **upload file** atau **paste kode program**, mengerjakan kuis, dan diskusi.
- Mentor menilai / memverifikasi tugas.
- Semua file tersimpan di folder server `backend/uploads/` dan tercatat di database MySQL.

## Arsitektur
```
[ Frontend: HTML + Tailwind + Vanilla JS ]
        |  REST API (JSON) + JWT
        v
[ Backend: Node.js + Express ]
        |
   +----+----+
   |         |
[MySQL]  [Folder uploads/]
```

Kenapa stack ini?
- Mudah dijelaskan di laporan PKL (frontend-backend terpisah jelas).
- Hosting murah, instalasi mudah.
- Cocok untuk fitur upload file + simpan kode.

## Struktur Repo
```
/home/payung/pkl-web/
├── docs/               # Perancangan untuk laporan PKL
│   ├── 00-gambaran-umum.md
│   ├── 01-kebutuhan.md
│   ├── 02-use-case.md
│   ├── 03-erd-dan-skema.md
│   ├── 04-alur-dan-sitemap.md
│   ├── 05-api-spec.md
│   └── 06-struktur-folder.md
├── database/schema.sql  # Skema MySQL
├── backend/            # REST API Express
└── frontend/           # Halaman statis
```

## Cara Menjalankan (1x perintah)

```bash
cd /home/payung/pkl-web/backend
npm install
npm run seed   # pengaturan awal (sekali saja)
npm start
```

Buka **http://localhost:3000** — frontend + API langsung jalan (database SQLite otomatis di `backend/data/elearning.db`).

Langsung daftar: **Daftar sebagai Mentor** → buat kelas → bagikan kode.
**Daftar sebagai Siswa** → gabung via kode → kerjakan tugas.

Alur coba: login mentor → buat kelas → copy kode → logout → login siswa → Gabung via Kode → kumpul tugas (file/kode) → login mentor → nilai → siswa lihat nilai.

📖 **Tutorial lengkap: `docs/09-tutorial-menjalankan.md`**
📖 **Adopsi referensi localStorage/BroadcastChannel: `docs/08-adopsi-referensi.md`**
