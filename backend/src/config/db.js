// Koneksi SQLite (node:sqlite bawaan Node 22+, tanpa dependensi native).
// DB file: backend/data/elearning.db (otomatis dibuat saat server jalan).
// Skema port dari database/schema.sql versi MySQL (untuk laporan).
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DB_PATH || path.join(dataDir, 'elearning.db');

const db = new DatabaseSync(dbPath);
// Mode konkurensi: banyak pembaca paralel + penulis antre rapi (penting untuk 1000 siswa).
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;");
try { db.exec('ALTER TABLE users ADD COLUMN last_seen DATETIME'); } catch {} // DB lama → tambah kolom kehadiran
try { db.exec('ALTER TABLE users ADD COLUMN username TEXT'); } catch {} // login siswa pakai username
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)'); } catch {}
try { db.exec("ALTER TABLE kelas_member ADD COLUMN status TEXT DEFAULT 'aktif'"); } catch {} // keluar/masuk tanpa hapus
try { db.exec('ALTER TABLE materi ADD COLUMN pertemuan INTEGER DEFAULT 1'); } catch {}
try { db.exec('ALTER TABLE tugas ADD COLUMN pertemuan INTEGER DEFAULT 1'); } catch {}
try { db.exec('ALTER TABLE kuis ADD COLUMN pertemuan INTEGER DEFAULT 1'); } catch {}
try { db.exec('ALTER TABLE notifikasi ADD COLUMN kunci TEXT'); } catch {} // dedup notif terjadwal
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_kunci ON notifikasi(kunci)'); } catch {}
try { db.exec(`CREATE TABLE blokir_permanen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  nama TEXT,
  oleh_mentor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`); } catch {}
try { db.exec('ALTER TABLE blokir_permanen ADD COLUMN username TEXT'); } catch {}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'siswa' CHECK (role IN ('mentor','siswa')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS kelas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nama_kelas TEXT NOT NULL,
  deskripsi TEXT,
  kode_kelas TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS kelas_member (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  siswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kelas_id, siswa_id)
);
CREATE TABLE IF NOT EXISTS materi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  file_path TEXT,
  link_video TEXT,
  urutan INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tugas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  deadline DATETIME,
  file_lampiran TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pengumpulan_tugas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tugas_id INTEGER NOT NULL REFERENCES tugas(id) ON DELETE CASCADE,
  siswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipe TEXT NOT NULL DEFAULT 'file' CHECK (tipe IN ('file','code')),
  file_path TEXT,
  kode_program TEXT,
  bahasa TEXT,
  nilai INTEGER CHECK (nilai BETWEEN 0 AND 100),
  feedback TEXT,
  status TEXT DEFAULT 'terkumpul' CHECK (status IN ('terkumpul','dinilai')),
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  graded_at DATETIME,
  UNIQUE (tugas_id, siswa_id)
);
CREATE TABLE IF NOT EXISTS kuis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  durasi_menit INTEGER DEFAULT 30,
  deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS soal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kuis_id INTEGER NOT NULL REFERENCES kuis(id) ON DELETE CASCADE,
  pertanyaan TEXT NOT NULL,
  opsi_a TEXT NOT NULL,
  opsi_b TEXT NOT NULL,
  opsi_c TEXT NOT NULL,
  opsi_d TEXT NOT NULL,
  kunci TEXT NOT NULL CHECK (kunci IN ('A','B','C','D'))
);
CREATE TABLE IF NOT EXISTS hasil_kuis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kuis_id INTEGER NOT NULL REFERENCES kuis(id) ON DELETE CASCADE,
  siswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skor INTEGER NOT NULL,
  jawaban TEXT NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kuis_id, siswa_id)
);
CREATE TABLE IF NOT EXISTS diskusi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  materi_id INTEGER REFERENCES materi(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES diskusi(id) ON DELETE CASCADE,
  isi TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notifikasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kelas_id INTEGER REFERENCES kelas(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  isi TEXT,
  dibaca INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS banned (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  siswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alasan TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kelas_id, siswa_id)
);
CREATE TABLE IF NOT EXISTS access_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  siswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','disetujui','ditolak')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kelas_id, siswa_id)
);
CREATE TABLE IF NOT EXISTS settings (
  kunci TEXT PRIMARY KEY,
  nilai TEXT
);
CREATE TABLE IF NOT EXISTS pengumuman (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  isi TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS aktivitas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kelas_mentor ON kelas(mentor_id);
CREATE INDEX IF NOT EXISTS idx_materi_kelas ON materi(kelas_id);
CREATE INDEX IF NOT EXISTS idx_tugas_kelas ON tugas(kelas_id);
CREATE INDEX IF NOT EXISTS idx_diskusi_kelas ON diskusi(kelas_id);
`);

module.exports = db;
