// Upload Multer: materi/ dan tugas/ dengan batas 5MB per file + whitelist ekstensi.
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const MAX_MB = Number(process.env.UPLOAD_MAX_MB || 10);
const DOKUMEN = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'txt', 'md'];
// TUGAS boleh berisi kode sumber siswa; MATERI hanya dokumen/media (menolak file kode yang bisa dieksekusi).
const ALLOWED_MATERI = new Set(DOKUMEN);
const ALLOWED_TUGAS = new Set([...DOKUMEN, 'js', 'py', 'php', 'java', 'html', 'css', 'c', 'cpp']);

function sanitize(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

function makeStorage(subdir) {
  const dest = path.join(__dirname, '..', '..', 'uploads', subdir);
  fs.mkdirSync(dest, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => cb(null, `${Date.now()}${Math.random().toString(36).slice(2, 7)}-${sanitize(file.originalname)}`),
  });
}

function fileFilterDengan(izin) {
  return (req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (!izin.has(ext)) return cb(new Error('Ekstensi .' + ext + ' tidak diizinkan'));
    cb(null, true);
  };
}

const makeUpload = (subdir, izin) => multer({
  storage: makeStorage(subdir),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: fileFilterDengan(izin),
});

const uploadMateri = makeUpload('materi', ALLOWED_MATERI);
const uploadTugas = makeUpload('tugas', ALLOWED_TUGAS);

module.exports = { uploadMateri, uploadTugas };
