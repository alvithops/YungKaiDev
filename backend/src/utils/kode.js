// Generator kode kelas unik, cth: WEB-7X2K9A (prefix opsional dari nama kelas).
const db = require('../config/db');

function randomPart(n = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function generateKode(namaKelas = '') {
  const prefix = (namaKelas.replace(/[^a-zA-Z]/g, '').slice(0, 3) || 'KLS').toUpperCase();
  return `${prefix}-${randomPart(6)}`;
}

function generateUniqueKode(namaKelas = '') {
  for (let i = 0; i < 10; i++) {
    const kode = generateKode(namaKelas);
    const ada = db.prepare('SELECT id FROM kelas WHERE kode_kelas = ?').get(kode);
    if (!ada) return kode;
  }
  return `KLS-${randomPart(6)}${Date.now().toString(36).toUpperCase()}`;
}

module.exports = { generateKode, generateUniqueKode };
