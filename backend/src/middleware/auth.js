// Middleware JWT — delegasi ke SATU file keamanan (utils/keamanan.js).
const keamanan = require('../utils/keamanan');

function signToken(user) {
  return keamanan.buatToken(user);
}

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Belum login (token kosong)', data: null });
  try {
    req.user = keamanan.cekToken(token);
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
