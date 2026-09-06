// Uji beban simultan (tanpa dependensi tambahan).
// Simulasi N siswa + mentor mengakses API dalam waktu bersamaan.
//
//   node loadtest.js [--users 200] [--putaran 3] [--base http://localhost:3000]
//   node loadtest.js --burst 1000   (1000x GET /api/health serentak)
//
// Prasyarat: server jalan. Akun + kelas uji dibuat otomatis bila belum ada.
function argStr(nama, def) {
  const i = process.argv.findIndex((x) => x === nama || x.startsWith(nama + '='));
  if (i < 0) return def;
  const a = process.argv[i];
  if (a.includes('=')) return a.split('=')[1];
  return process.argv[i + 1] || def;
}
const BASE = argStr('--base', 'http://localhost:3000');
function arg(nama, def) {
  const i = process.argv.findIndex((x) => x === nama || x.startsWith(nama + '='));
  if (i < 0) return def;
  const a = process.argv[i];
  if (a.includes('=')) return Number(a.split('=')[1]);
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) ? v : def;
}
const USERS = arg('--users', 200);
const PUTARAN = arg('--putaran', 3);
const BURST = arg('--burst', 0);
const GELOMBANG = arg('--gelombang', USERS); // batas serentak per gelombang (pola nyata)

async function api(method, path, token, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

async function pastikanAkun(nama, email, password, role) {
  let j = await api('POST', '/api/auth/login', null, { email, password });
  if (j.success) return j.data.token;
  j = await api('POST', '/api/auth/register', null, { nama, email, password, role });
  if (!j.success) throw new Error('Gagal siapkan akun uji ' + email + ': ' + j.message);
  return j.data.token;
}

async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.success) throw new Error('Login gagal: ' + email + ' → ' + j.message);
  return j.data.token;
}

function latensi() {
  const t0 = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - t0) / 1e6; // ms
}

async function tembak(method, path, token, hasil) {
  const stop = latensi();
  try {
    const r = await fetch(BASE + path, { method, headers: token ? { Authorization: 'Bearer ' + token } : {} });
    const j = await r.json().catch(() => ({}));
    const ok = r.status < 500 && j.success !== false;
    hasil.cat.push(stop());
    ok ? hasil.ok++ : hasil.gagal++;
    if (!ok && hasil.contohGagal.length < 3) hasil.contohGagal.push(`${method} ${path} → ${r.status} ${JSON.stringify(j).slice(0, 120)}`);
  } catch (e) {
    hasil.cat.push(stop());
    hasil.gagal++;
    if (hasil.contohGagal.length < 3) hasil.contohGagal.push(`${method} ${path} → ERROR ${e.message}`);
  }
}

// 1 siswa virtual = 6 request khas pemakaian nyata (lazy: baru jalan saat dipanggil)
function skenarioSiswa(token, h, kid) {
  return [
    () => tembak('GET', '/api/kelas', token, h),
    () => tembak('GET', `/api/kelas/${kid}/materi`, token, h),
    () => tembak('GET', `/api/kelas/${kid}/tugas`, token, h),
    () => tembak('GET', `/api/kelas/${kid}/diskusi`, token, h),
    () => tembak('GET', '/api/notifikasi/belum-baca', token, h),
    () => tembak('GET', '/api/dashboard/siswa', token, h),
  ];
}

async function lapor(nama, hasil, totalMs) {
  const a = hasil.cat.sort((x, y) => x - y);
  const p = (q) => a[Math.min(a.length - 1, Math.floor(a.length * q))].toFixed(1);
  console.log(`\n== ${nama} ==`);
  console.log(`Total request : ${hasil.ok + hasil.gagal} (sukses ${hasil.ok}, gagal ${hasil.gagal})`);
  console.log(`Waktu total   : ${(totalMs / 1000).toFixed(1)} dtk → ${((hasil.ok + hasil.gagal) / (totalMs / 1000)).toFixed(0)} req/detik`);
  console.log(`Latensi (ms)  : min ${p(0)} | rata ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)} | p95 ${p(0.95)} | max ${p(0.99)}`);
  hasil.contohGagal.forEach((g) => console.log('  GAGAL: ' + g));
}

(async () => {
  console.log(`Uji beban → ${BASE}`);
  // siapkan akun + kelas uji sendiri (tidak tergantung akun demo)
  const tMentor = await pastikanAkun('Mentor Uji', 'mentor-uji@load.tes', 'load12345', 'mentor');
  const tSiswa = await pastikanAkun('Siswa Uji', 'siswa-uji@load.tes', 'load12345', 'siswa');
  let kelasSaya = await api('GET', '/api/kelas', tMentor);
  let kid;
  if (kelasSaya.success && kelasSaya.data.length) {
    kid = kelasSaya.data[0].id;
  } else {
    const buat = await api('POST', '/api/kelas', tMentor, { nama_kelas: 'Kelas Uji Beban', deskripsi: 'otomatis' });
    if (!buat.success) throw new Error('Gagal buat kelas uji: ' + buat.message);
    kid = buat.data.id;
  }
  await api('POST', '/api/kelas/join', tSiswa, { kode_kelas: (await api('GET', `/api/kelas/${kid}`, tMentor)).data.kode_kelas });
  console.log(`Akun uji siap (kelas id ${kid}). JWT stateless → tiap user mandiri`);

  if (BURST > 0) {
    const h = { ok: 0, gagal: 0, cat: [], contohGagal: [] };
    const t0 = Date.now();
    await Promise.all(Array.from({ length: BURST }, () => tembak('GET', '/api/health', null, h)));
    await lapor(`BURST ${BURST}x serentak (/api/health)`, h, Date.now() - t0);
    return;
  }

  const h = { ok: 0, gagal: 0, cat: [], contohGagal: [] };
  const t0 = Date.now();
  for (let r = 0; r < PUTARAN; r++) {
    const batch = [];
    for (let i = 0; i < USERS; i++) {
      if (i % 10 === 0) batch.push(() => tembak('GET', '/api/dashboard/mentor', tMentor, h)); // 10% peran mentor
      batch.push(...skenarioSiswa(tSiswa, h, kid));
    }
    // kirim per gelombang agar mirip pola nyata (tidak semua klik 1 milidetik)
    for (let g = 0; g < batch.length; g += GELOMBANG) {
      await Promise.all(batch.slice(g, g + GELOMBANG).map((fn) => fn()));
    }
    console.log(`putaran ${r + 1}/${PUTARAN} selesai (${batch.length} req, gelombang ${GELOMBANG})`);
  }
  await lapor(`${USERS} user serentak x ${PUTARAN} putaran (campuran siswa+mentor)`, h, Date.now() - t0);
})().catch((e) => { console.error('LOADTEST GAGAL:', e.message); process.exit(1); });
