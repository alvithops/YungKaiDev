// Halaman Kelas KHUSUS SISWA: Pertemuan 1–14 dinamis (Modul/Tugas/Kuis) + diskusi.
// Render ulang otomatis via polling 10 dtk + BroadcastChannel (tanpa reload manual).
// (Mentor yang membuka halaman ini = mode pantau read-only.)
(async () => {
  const user = await requireAuth();
  const kelasId = new URLSearchParams(location.search).get('id');
  if (!kelasId) { location.href = 'class-siswa.html'; return; }
  const pantau = user.role === 'mentor';
  let bolehAksi = !pantau; // false saat pantau ATAU sedang keluar kelas
  const tgl = (s) => (s ? new Date(s).toLocaleString('id-ID') : '—');
  const P = (x) => Math.min(14, Math.max(1, Number(x) || 1));

  try {
    const k = await apiFetch(`/kelas/${kelasId}`);
    document.getElementById('judul-kelas').textContent = k.nama_kelas;
    document.getElementById('deskripsi-kelas').textContent = k.deskripsi || '';
    document.getElementById('nama-mentor').textContent = k.mentor_nama || '—';
    if (pantau) {
      document.getElementById('banner-pantau').innerHTML =
        `<div class="nb-alert nb-alert-yellow mb">👁 <b>Mode pantau mentor:</b> tampilan siswa, read-only.</div>`;
      const ff = document.getElementById('form-diskusi');
      if (ff) ff.remove(); // kunci total: tidak ada form aksi dalam mode pantau
    } else if (k.status_saya === 'keluar') {
      bolehAksi = false;
      document.getElementById('banner-pantau').innerHTML =
        `<div class="nb-alert nb-alert-yellow mb">🚪 Kamu sedang <b>keluar</b> dari kelas ini — modul, tugas, dan kuis terkunci sampai masuk kembali. <button class="nb-btn nb-btn-sm nb-btn-primary" data-masuk-kelas="${kelasId}">Masuk Kembali (tanpa kode) →</button></div>`;
    }
  } catch (e) { toast(e.message, 'red'); return; }

  let cacheM = [], cacheT = [], cacheK = [];

  async function muatSemua() {
    try {
      const [m, t, k] = await Promise.all([
        apiFetch(`/kelas/${kelasId}/materi`).catch((e) => { throw e; }),
        apiFetch(`/kelas/${kelasId}/tugas`).catch((e) => { throw e; }),
        apiFetch(`/kelas/${kelasId}/kuis`).catch((e) => { throw e; }),
      ]);
      cacheM = m; cacheT = t; cacheK = k;
    } catch (e) {
      if (!bolehAksi) {
        document.getElementById('list-pertemuan').innerHTML =
          `<div class="nb-alert nb-alert-yellow">🔒 Konten terkunci — masuk kembali ke kelas untuk mengakses Pertemuan 1–14.</div>`;
        return;
      }
      toast(e.message, 'red');
      return;
    }
    renderPertemuan();
  }

  function htmlModul(m) {
    return `<div class="nb-card mb"><div class="nb-card-body"><b>📖 ${esc(m.judul)}</b>
      ${m.deskripsi ? `<p class="nb-hint">${esc(m.deskripsi)}</p>` : ''}
      <div class="row mt">
      ${m.link_video ? `<a class="nb-btn nb-btn-sm nb-btn-pink" href="${esc(m.link_video)}" target="_blank">▶ Tonton</a>` : ''}
      ${m.file_path ? `<a class="nb-btn nb-btn-sm nb-btn-blue" href="${FILE_BASE_URL + m.file_path}" target="_blank">⬇ Unduh Materi</a>` : ''}
      </div></div></div>`;
  }

  function htmlTugas(t) {
    let aksi = '';
    if (bolehAksi && (!t.saya || t.saya.status !== 'dinilai')) {
      aksi = `
        <div class="row mt">
          <input type="file" id="file-${t.id}" class="nb-input" style="flex:1" aria-label="Pilih file tugas" />
          <button class="nb-btn nb-btn-sm nb-btn-blue" data-kumpul-file="${t.id}">📎 Kumpul File</button>
        </div>
        <div class="row mt">
          <select id="lang-${t.id}" class="nb-select" style="max-width:130px" aria-label="Bahasa">
            <option value="py">Python</option><option value="js">JavaScript</option><option value="php">PHP</option><option value="java">Java</option><option value="html">HTML</option><option value="txt">Teks</option>
          </select>
          <button class="nb-btn nb-btn-sm nb-btn-dark" data-kumpul-kode-toggle="${t.id}">&lt;/&gt; Tulis Kode</button>
        </div>
        <div id="kodebox-${t.id}" style="display:none" class="mt">
          <textarea id="kode-${t.id}" class="nb-textarea mono" rows="6" placeholder="Tempel kode program di sini..."></textarea>
          <button class="nb-btn nb-btn-sm nb-btn-primary mt" data-kumpul-kode="${t.id}">Kirim Kode →</button>
        </div>
        ${t.saya?.feedback ? `<div class="nb-alert nb-alert-blue mt">🗨 Feedback mentor: ${esc(t.saya.feedback)}</div>` : ''}`;
    } else if (t.saya?.status === 'dinilai') {
      aksi = `<div class="nb-alert nb-alert-green mt">✓ Nilai: <b>${t.saya.nilai}</b>${t.saya.feedback ? ' — “' + esc(t.saya.feedback) + '”' : ''}</div>`;
    }
    return `<div class="nb-card mb"><div class="nb-card-body">
      <div class="row"><b>📥 ${esc(t.judul)}</b><span style="flex:1"></span>
      ${t.deadline ? `<span class="nb-badge red">⏰ ${tgl(t.deadline)}</span>` : ''}
      ${t.saya ? (t.saya.status === 'dinilai' ? `<span class="nb-badge green">✓ ${t.saya.nilai}</span>` : `<span class="nb-badge yellow">● Terkumpul</span>`) : `<span class="nb-badge red">Belum kumpul</span>`}</div>
      ${t.deskripsi ? `<p class="nb-hint">${esc(t.deskripsi)}</p>` : ''}${aksi}</div></div>`;
  }

  function htmlKuis(k) {
    return `<div class="nb-card mb"><div class="nb-card-body">
      <div class="row"><b>📝 ${esc(k.judul)}</b><span style="flex:1"></span><span class="nb-badge blue">${k.jml_soal} soal</span>
      ${bolehAksi ? (k.saya ? `<span class="nb-badge green">Skor: ${k.saya.skor}</span>` : `<button class="nb-btn nb-btn-sm nb-btn-primary" data-mulai-kuis="${k.id}">Mulai →</button>`) : ''}</div>
      ${k.deskripsi ? `<p class="nb-hint">${esc(k.deskripsi)}</p>` : ''}
      <div class="kuis-box mt"></div></div></div>`;
  }

  function renderPertemuan() {
    const box = document.getElementById('list-pertemuan');
    box.innerHTML = '';
    for (let p = 1; p <= 14; p++) {
      const mods = cacheM.filter((m) => P(m.pertemuan) === p);
      const tugs = cacheT.filter((t) => P(t.pertemuan) === p);
      const kuis = cacheK.filter((k) => P(k.pertemuan) === p);
      const ada = mods.length + tugs.length + kuis.length;
      const el = document.createElement('div');
      el.className = 'nb-card mb';
      el.innerHTML = `<div class="nb-card-header ${ada ? 'yellow' : ''}"><span>PERTEMUAN ${p}</span>
        <span><span class="nb-badge blue">${mods.length} modul</span> <span class="nb-badge pink">${tugs.length} tugas</span> <span class="nb-badge blue">${kuis.length} kuis</span></span></div>
        <div class="nb-card-body">${ada ? '' : `<div class="nb-hint">Belum diisi mentor.</div>`}</div>`;
      const body = el.querySelector('.nb-card-body');
      if (mods.length) {
        const h = document.createElement('b'); h.textContent = '📖 Modul'; body.appendChild(h);
        mods.forEach((m) => body.insertAdjacentHTML('beforeend', htmlModul(m)));
      }
      if (tugs.length) {
        const h = document.createElement('b'); h.textContent = '📥 Tugas'; body.appendChild(h);
        tugs.forEach((t) => body.insertAdjacentHTML('beforeend', htmlTugas(t)));
      }
      if (kuis.length) {
        const h = document.createElement('b'); h.textContent = '📝 Kuis'; body.appendChild(h);
        kuis.forEach((k) => body.insertAdjacentHTML('beforeend', htmlKuis(k)));
      }
      box.appendChild(el);
    }
  }

  async function mulaiKuis(id, box) {
    try {
      const soal = await apiFetch(`/kuis/${id}/soal`);
      if (!soal.length) return toast('Kuis belum punya soal', 'red');
      box.innerHTML = soal.map((s, i) => `
        <div class="mb"><b>${i + 1}. ${esc(s.pertanyaan)}</b>
        ${['A', 'B', 'C', 'D'].map((o) => `<label class="row" style="font-weight:400"><input type="radio" name="j-${s.id}" value="${o}" data-jawab="${id}" /> <b>${o}.</b> ${esc(s['opsi_' + o.toLowerCase()])}</label>`).join('')}</div>`).join('')
        + `<button class="nb-btn nb-btn-primary" data-kirim-kuis="${id}">Kumpulkan Jawaban →</button>`;
    } catch (err) { toast(err.message, 'red'); }
  }

  document.addEventListener('click', async (e) => {
    const mk = e.target.closest('[data-masuk-kelas]');
    if (mk) {
      try { await apiFetch(`/kelas/${mk.dataset.masukKelas}/masuk`, { method: 'POST' }); toast('Masuk kembali ✓', 'green'); location.reload(); }
      catch (err) { toast(err.message, 'red'); }
      return;
    }
    const q = (s) => e.target.closest(s);
    let b;
    if ((b = q('[data-kumpul-kode-toggle]'))) {
      const bx = document.getElementById('kodebox-' + b.dataset.kumpulKodeToggle);
      bx.style.display = bx.style.display === 'none' ? 'block' : 'none';
    }
    if ((b = q('[data-kumpul-file]'))) {
      const id = b.dataset.kumpulFile;
      const f = document.getElementById('file-' + id).files[0];
      if (!f) return toast('Pilih file dulu', 'red');
      const form = new FormData(); form.append('file', f);
      b.disabled = true;
      try { await apiFetch(`/tugas/${id}/kumpul`, { method: 'POST', form }); toast('File terkumpul ✓', 'green'); muatSemua(); }
      catch (err) { toast(err.message, 'red'); } finally { b.disabled = false; }
    }
    if ((b = q('[data-kumpul-kode]'))) {
      const id = b.dataset.kumpulKode;
      const kode = document.getElementById('kode-' + id).value;
      const bahasa = document.getElementById('lang-' + id).value;
      if (!kode.trim()) return toast('Kode masih kosong', 'red');
      b.disabled = true;
      try { await apiFetch(`/tugas/${id}/kumpul`, { method: 'POST', body: { tipe: 'code', bahasa, kode_program: kode } }); toast('Kode terkumpul ✓', 'green'); muatSemua(); }
      catch (err) { toast(err.message, 'red'); } finally { b.disabled = false; }
    }
    if ((b = q('[data-mulai-kuis]'))) mulaiKuis(b.dataset.mulaiKuis, b.closest('.nb-card').querySelector('.kuis-box'));
    if ((b = q('[data-kirim-kuis]'))) {
      const id = b.dataset.kirimKuis;
      const jawaban = {};
      document.querySelectorAll(`[data-jawab="${id}"]:checked`).forEach((r) => { jawaban[r.name.split('-')[1]] = r.value; });
      try {
        const h = await apiFetch(`/kuis/${id}/submit`, { method: 'POST', body: { jawaban } });
        toast(`Skor: ${h.skor} (${h.benar}/${h.total} benar)`, 'green'); muatSemua();
      } catch (err) { toast(err.message, 'red'); }
    }
  });

  // ---------- Diskusi ----------
  async function muatDiskusi() {
    try {
      const tree = await apiFetch(`/kelas/${kelasId}/diskusi`);
      const box = document.getElementById('list-diskusi');
      const render = (nodes, dalam = 0) => nodes.map((d) => `
        <div class="nb-alert ${dalam ? 'nb-alert-blue' : 'nb-alert-yellow'} mb" ${dalam ? 'style="margin-left:16px"' : ''}>
          <b>${esc(d.penulis)}</b> <span class="nb-badge ${d.penulis_role === 'mentor' ? 'dark' : 'blue'}" style="font-size:10px">${esc(d.penulis_role)}</span>
          <div>${esc(d.isi)}</div>
          <div class="row mt"><button class="nb-btn nb-btn-sm" data-balas="${d.id}">Balas</button>
          ${(!pantau && d.user_id === user.id) ? `<button class="nb-btn nb-btn-sm nb-btn-danger" data-hapus-diskusi="${d.id}">Hapus</button>` : ''}</div>
        </div>${render(d.balasan || [], dalam + 1)}`).join('');
      box.innerHTML = tree.length ? render(tree) : `<div class="nb-alert nb-alert-yellow">Belum ada diskusi. Mulai duluan!</div>`;
    } catch (e) { /* diam saat auto-refresh */ }
  }

  const fdForm = document.getElementById('form-diskusi');
  if (fdForm) fdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!bolehAksi) return;
    const isi = fd_isi.value.trim();
    if (!isi) return;
    try {
      await apiFetch(`/kelas/${kelasId}/diskusi`, { method: 'POST', body: { isi, parent_id: fd_parent.value || null } });
      fd_isi.value = ''; fd_parent.value = ''; muatDiskusi();
    } catch (err) { toast(err.message, 'red'); }
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-balas]');
    if (b && bolehAksi) { fd_parent.value = b.dataset.balas; fd_isi.focus(); }
    const h = e.target.closest('[data-hapus-diskusi]');
    if (h && confirm('Hapus pesan ini?')) {
      try { await apiFetch(`/diskusi/${h.dataset.hapusDiskusi}`, { method: 'DELETE' }); muatDiskusi(); }
      catch (err) { toast(err.message, 'red'); }
    }
  });

  muatSemua(); muatDiskusi();
  setInterval(() => { muatSemua(); muatDiskusi(); }, 10000); // sinkron otomatis
  dengarRefresh(() => { muatSemua(); muatDiskusi(); }); // instan lintas-tab
})();
