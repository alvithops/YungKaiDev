// Middleware JWT — delegasi ke SATU file keamanan (utils/keamanan.js).
const keamanan = require('../utils/keamanan');
const db = require('../config/db');

function signToken(user) {
  return keamanan.buatToken(user);
}

function tandaiHadir(userId) {
  // kehadiran online: tulis max 1x/menit per user (hindari write storm 2000 user)
  try {
    db.prepare(`UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ? AND (last_seen IS NULL OR last_seen < datetime('now', '-1 minute'))`).run(userId);
  } catch {}
}

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Belum login (token kosong)', data: null });
  try {
    req.user = keamanan.cekToken(token);
    tandaiHadir(req.user.id); // setiap request API = bukti user sedang online
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token tidak valid / kedaluwarsa', data: null });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: butuh peran ' + roles.join('/'), data: null });
    }
    next();
  };
}

module.exports = { signToken, verifyToken, requireRole };
