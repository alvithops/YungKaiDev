// E-Learning PKL-Web — REST API + serve frontend statis (1x jalan).
// Mode cluster (multi-core) untuk 1000 siswa: CLUSTER=1 npm start
require('dotenv').config();
const cluster = require('cluster');
const os = require('os');

if ((process.env.CLUSTER === '1' || process.argv.includes('--cluster')) && cluster.isPrimary) {
  const n = Number(process.env.WORKERS) || os.cpus().length;
  console.log(`[cluster] primer ${process.pid}: menjalankan ${n} worker...`);
  for (let i = 0; i < n; i++) cluster.fork();
  cluster.on('exit', (w) => { console.log(`[cluster] worker ${w.process.pid} mati → restart`); cluster.fork(); });
  return;
}

const express = require('express');
const cors = require('cors');
const path = require('path');

require('./src/config/db'); // init SQLite + tabel

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// File upload bisa diakses: http://localhost:3000/uploads/tugas/xxx.zip
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Frontend: http://localhost:3000/
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const { diskusi, dash } = require('./src/routes/diskusi-dashboard');
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api', require('./src/routes/kelas'));
app.use('/api', require('./src/routes/materi'));
app.use('/api', require('./src/routes/tugas'));
app.use('/api', require('./src/routes/kuis'));
app.use('/api', diskusi); // GET+POST /api/kelas/:id/diskusi & DELETE /api/diskusi/:id
app.use('/api', require('./src/routes/ekstra'));
app.use('/api/dashboard', dash);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend PKL-Web jalan', data: { time: new Date().toISOString() } });
});

// fallback error multer/dll → JSON konsisten
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  return res.status(400).json({ success: false, message: err.message || 'Terjadi kesalahan', data: null });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`E-Learning jalan di http://localhost:${PORT} (worker ${process.pid})`));
