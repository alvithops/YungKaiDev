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
      ${m.link_video ? `<a class="nb-btn nb-btn-sm nb-btn-pink" href="${esc(m.link_video)}" target="_blank" data-baca-materi="${m.id}">▶ Tonton</a>` : ''}
      ${m.file_path ? `<a class="nb-btn nb-btn-sm nb-btn-blue" href="${apiFile(m.file_path)}" target="_blank" data-baca-materi="${m.id}">⬇ Unduh Materi</a>` : ''}
      </div></div></div>`;
  }

  // Draf pengumpulan per tugas: file & teks tersimpan di memori agar tidak hilang
  // saat daftar me-refresh otomatis (bug: nama file sempat muncul lalu hilang).
  const drafTugas = {}; // tugasId -> {mode:'file'|'text', file:File|null, namaFile, teks}
  function htmlTugas(t) {
    let aksi = '';
    if (bolehAksi && (!t.saya || t.saya.status !== 'dinilai')) {
      const d = drafTugas[t.id] || {};
      const mode = d.mode || 'file';
      aksi = `
        <div class="row mt" role="radiogroup" aria-label="Mode pengumpulan">
          <label class="row" style="font-weight:700"><input type="radio" name="mode-${t.id}" value="file" data-mode-radio="${t.id}"${mode === 'file' ? ' checked' : ''} /> 📎 Upload File</label>
          <label class="row" style="font-weight:700"><input type="radio" name="mode-${t.id}" value="text" data-mode-radio="${t.id}"${mode === 'text' ? ' checked' : ''} /> 📝 Text</label>
        </div>
        <div id="mode-file-${t.id}" style="${mode === 'file' ? '' : 'display:none'}">
          <div class="row mt">
            <input type="file" id="file-${t.id}" data-file-input="${t.id}" class="nb-input" style="flex:1" aria-label="Pilih file tugas (PDF, PPT, Excel, Word, dll)" />
            <button class="nb-btn nb-btn-sm nb-btn-blue" data-kumpul-file="${t.id}">Kumpul File</button>
          </div>
          <div id="chip-${t.id}" class="nb-hint mt">${d.namaFile ? `📎 ${esc(d.namaFile)} ✓ siap dikirim (tersimpan, aman refresh)` : ''}</div>
        </div>
        <div id="mode-text-${t.id}" style="${mode === 'text' ? '' : 'display:none'}" class="mt">
          <textarea id="kode-${t.id}" data-teks-input="${t.id}" class="nb-textarea" rows="6" placeholder="Tulis jawaban esai / catatan langsung di sini...">${esc(d.teks || '')}</textarea>
          <button class="nb-btn nb-btn-sm nb-btn-primary mt" data-kumpul-kode="${t.id}">Kirim Teks →</button>
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
    // bersihkan draf tugas yang sudah dihapus mentor (anti yatim di memori)
    const idsAktif = new Set(cacheT.map((t) => t.id));
    for (const k of Object.keys(drafTugas)) if (!idsAktif.has(Number(k))) delete drafTugas[k];
  }

  let timerKuis = null;
  let kuisSedangDikerjakan = false; // true saat soal terbuka → refresh otomatis JEDA agar tidak menutup kuis
  async function mulaiKuis(id, box) {
    try {
      const mulai = await apiFetch(`/kuis/${id}/mulai`, { method: 'POST' });
      const soal = await apiFetch(`/kuis/${id}/soal`);
      if (!soal.length) return toast('Kuis belum punya soal', 'red');
      const sisa = Math.max(0, Math.round((mulai.durasi_menit || 30) * 60 - (Date.now() - new Date(String(mulai.mulai_pada).replace(' ', 'T') + 'Z').getTime()) / 1000));
      box.innerHTML = `<div class="nb-alert nb-alert-yellow mb">⏱ Sisa waktu: <b id="timer-${id}">…</b> (ditegakkan server)</div>` + soal.map((s, i) => `
        <div class="mb"><b>${i + 1}. ${esc(s.pertanyaan)}</b> ${(s.tipe || 'pg') === 'essay' ? `<span class="nb-badge pink">ESAI</span>` : ''}
        ${(s.tipe || 'pg') === 'essay'
          ? `<textarea name="j-${s.id}" data-jawab="${id}" class="nb-textarea mono" rows="4" placeholder="Tulis jawaban esaimu..."></textarea>`
          : ['A', 'B', 'C', 'D'].map((o) => `<label class="row" style="font-weight:400"><input type="radio" name="j-${s.id}" value="${o}" data-jawab="${id}" /> <b>${o}.</b> ${esc(s['opsi_' + o.toLowerCase()])}</label>`).join('')}</div>`).join('')
        + `<button class="nb-btn nb-btn-primary" data-kirim-kuis="${id}">Kumpulkan Jawaban →</button>`;
      clearInterval(timerKuis);
      let t = sisa;
      const tick = () => {
        const el = document.getElementById('timer-' + id);
        if (!el) { clearInterval(timerKuis); return; }
        el.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
        if (t <= 0) {
          clearInterval(timerKuis);
          toast('Waktu habis, jawaban dikumpulkan otomatis', 'yellow');
          el.closest('.nb-card-body')?.querySelector('[data-kirim-kuis]')?.click();
        }
        t--;
      };
      tick();
      timerKuis = setInterval(tick, 1000);
      kuisSedangDikerjakan = true; // kunci tampilan sampai dikumpulkan/habis
    } catch (err) { toast(err.message, 'red'); }
  }

  // Draf anti-hilang: mode, file terpilih, dan ketikan tersimpan di memori
  document.addEventListener('change', (e) => {
    const r = e.target.closest('[data-mode-radio]');
    if (r) {
      const id = r.dataset.modeRadio;
      drafTugas[id] = { ...(drafTugas[id] || {}), mode: r.value };
      const mf = document.getElementById('mode-file-' + id);
      const mt = document.getElementById('mode-text-' + id);
      if (mf) mf.style.display = r.value === 'file' ? '' : 'none';
      if (mt) mt.style.display = r.value === 'text' ? '' : 'none';
      return;
    }
    const f = e.target.closest('[data-file-input]');
    if (f) {
      const id = f.dataset.fileInput;
      const file = (f.files && f.files[0]) || null;
      drafTugas[id] = { ...(drafTugas[id] || {}), file, namaFile: file ? file.name : '' };
      const chip = document.getElementById('chip-' + id);
      if (chip) chip.innerHTML = file ? `📎 ${esc(file.name)} ✓ siap dikirim (tersimpan, aman refresh)` : '';
    }
  });
  document.addEventListener('input', (e) => {
    const t = e.target.closest('[data-teks-input]');
    if (t) drafTugas[t.dataset.teksInput] = { ...(drafTugas[t.dataset.teksInput] || {}), teks: t.value };
  });

  document.addEventListener('click', async (e) => {
    const bc = e.target.closest('[data-baca-materi]');
    if (bc && bolehAksi) apiFetch(`/materi/${bc.dataset.bacaMateri}/baca`, { method: 'POST' }).catch(() => {}); // jejak dibaca, diam-diam
    const mk = e.target.closest('[data-masuk-kelas]');
    if (mk) {
      try { await apiFetch(`/kelas/${mk.dataset.masukKelas}/masuk`, { method: 'POST' }); toast('Masuk kembali ✓', 'green'); location.reload(); }
      catch (err) { toast(err.message, 'red'); }
      return;
    }
    const q = (s) => e.target.closest(s);
    let b;
    if ((b = q('[data-kumpul-file]'))) {
      const id = b.dataset.kumpulFile;
      const draf = drafTugas[id] || {};
      const f = draf.file || (document.getElementById('file-' + id).files || [])[0];
      if (!f) return toast('Pilih file dulu (PDF, PPT, Excel, Word, dll)', 'red');
      const form = new FormData(); form.append('file', f);
      b.disabled = true;
      try { await apiFetch(`/tugas/${id}/kumpul`, { method: 'POST', form }); delete drafTugas[id]; toast('File terkumpul ✓', 'green'); muatSemua(); }
      catch (err) { toast(err.message, 'red'); } finally { b.disabled = false; }
    }
    if ((b = q('[data-kumpul-kode]'))) {
      const id = b.dataset.kumpulKode;
      const draf = drafTugas[id] || {};
      const teks = (draf.teks !== undefined ? draf.teks : document.getElementById('kode-' + id).value) || '';
      if (!teks.trim()) return toast('Tulis jawaban teks dulu', 'red');
      b.disabled = true;
      try { await apiFetch(`/tugas/${id}/kumpul`, { method: 'POST', body: { tipe: 'code', bahasa: 'txt', kode_program: teks } }); delete drafTugas[id]; toast('Teks terkumpul ✓', 'green'); muatSemua(); }
      catch (err) { toast(err.message, 'red'); } finally { b.disabled = false; }
    }
    if ((b = q('[data-mulai-kuis]'))) mulaiKuis(b.dataset.mulaiKuis, b.closest('.nb-card').querySelector('.kuis-box'));
    if ((b = q('[data-kirim-kuis]'))) {
      const id = b.dataset.kirimKuis;
      const jawaban = {};
      document.querySelectorAll(`[data-jawab="${id}"]`).forEach((el) => {
        if (el.type === 'radio') { if (el.checked) jawaban[el.name.split('-')[1]] = el.value; }
        else jawaban[el.name.split('-')[1]] = el.value;
      });
      try {
        const h = await apiFetch(`/kuis/${id}/submit`, { method: 'POST', body: { jawaban } });
        clearInterval(timerKuis);
        kuisSedangDikerjakan = false; // buka kunci, refresh boleh jalan lagi
        toast(h.esai_menunggu ? `Tersimpan ✓ (PG: ${h.skor}, esai menunggu dinilai mentor)` : `Skor: ${h.skor} (${h.benar}/${h.total} benar)`, 'green'); muatSemua();
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
  setInterval(() => { if (!kuisSedangDikerjakan) muatSemua(); muatDiskusi(); }, 10000); // jeda saat kuis terbuka
  dengarRefresh(() => { if (!kuisSedangDikerjakan) muatSemua(); muatDiskusi(); }); // instan lintas-tab, hormati kuis terbuka
})();
