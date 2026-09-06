// Upload Multer: materi/ dan tugas/ dengan batas 5MB per file + whitelist ekstensi.
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const MAX_MB = Number(process.env.UPLOAD_MAX_MB || 10);
const ALLOWED = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'txt', 'md', 'js', 'py', 'php', 'java', 'html', 'css', 'c', 'cpp']);

function sanitize(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

function makeStorage(subdir) {
  const dest = path.join(__dirname, '..', '..', 'uploads', subdir);
  fs.mkdirSync(dest, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${sanitize(file.originalname)}`),
  });
}

function fileFilter(req, file, cb) {
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  if (!ALLOWED.has(ext)) return cb(new Error('Ekstensi .' + ext + ' tidak diizinkan'));
  cb(null, true);
}

const uploadMateri = multer({
  storage: makeStorage('materi'),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter,
});

const uploadTugas = multer({
  storage: makeStorage('tugas'),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter,
});

module.exports = { uploadMateri, uploadTugas };
