-- Skema Database E-Learning PKL-Web (MySQL 8 / MariaDB)
-- Cara pakai: CREATE DATABASE elearning; USE elearning; SOURCE schema.sql;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('mentor','siswa') NOT NULL DEFAULT 'siswa',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kelas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mentor_id INT NOT NULL,
  nama_kelas VARCHAR(150) NOT NULL,
  deskripsi TEXT,
  kode_kelas VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mentor (mentor_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kelas_member (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kelas_id INT NOT NULL,
  siswa_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kelas_siswa (kelas_id, siswa_id),
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
  FOREIGN KEY (siswa_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS materi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kelas_id INT NOT NULL,
  judul VARCHAR(200) NOT NULL,
  deskripsi TEXT,
  file_path VARCHAR(255) NULL,
  link_video VARCHAR(255) NULL,
  urutan INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
  INDEX idx_materi_kelas (kelas_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tugas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kelas_id INT NOT NULL,
  judul VARCHAR(200) NOT NULL,
  deskripsi TEXT,
  deadline DATETIME NULL,
  file_lampiran VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
  INDEX idx_tugas_kelas (kelas_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pengumpulan_tugas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tugas_id INT NOT NULL,
  siswa_id INT NOT NULL,
  tipe ENUM('file','code') NOT NULL DEFAULT 'file',
  file_path VARCHAR(255) NULL,
  kode_program MEDIUMTEXT NULL,
  bahasa VARCHAR(20) NULL,
  nilai INT NULL CHECK (nilai BETWEEN 0 AND 100),
  feedback TEXT NULL,
  status ENUM('terkumpul','dinilai') DEFAULT 'terkumpul',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  graded_at DATETIME NULL,
  UNIQUE KEY uq_tugas_siswa (tugas_id, siswa_id),
  FOREIGN KEY (tugas_id) REFERENCES tugas(id) ON DELETE CASCADE,
  FOREIGN KEY (siswa_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kuis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kelas_id INT NOT NULL,
  judul VARCHAR(200) NOT NULL,
  deskripsi TEXT,
  durasi_menit INT DEFAULT 30,
  deadline DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS soal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kuis_id INT NOT NULL,
  pertanyaan TEXT NOT NULL,
  opsi_a VARCHAR(500) NOT NULL,
  opsi_b VARCHAR(500) NOT NULL,
  opsi_c VARCHAR(500) NOT NULL,
  opsi_d VARCHAR(500) NOT NULL,
  kunci CHAR(1) NOT NULL,
  FOREIGN KEY (kuis_id) REFERENCES kuis(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hasil_kuis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kuis_id INT NOT NULL,
  siswa_id INT NOT NULL,
  skor INT NOT NULL,
  jawaban JSON NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kuis_siswa (kuis_id, siswa_id),
  FOREIGN KEY (kuis_id) REFERENCES kuis(id) ON DELETE CASCADE,
  FOREIGN KEY (siswa_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS diskusi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kelas_id INT NOT NULL,
  materi_id INT NULL,
  user_id INT NOT NULL,
  parent_id INT NULL,
  isi TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
  FOREIGN KEY (materi_id) REFERENCES materi(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES diskusi(id) ON DELETE CASCADE,
  INDEX idx_diskusi_kelas (kelas_id)
) ENGINE=InnoDB;
