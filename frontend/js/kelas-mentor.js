// Kelola Kelas KHUSUS MENTOR: modul, tugas+penilaian, kuis+soal, moderasi, pengumuman.
(async () => {
  const user = await requireAuth();
  const kelasId = new URLSearchParams(location.search).get('id');
  if (!kelasId) { location.href = 'class-mentor.html'; return; }
  if (user.role !== 'mentor') { location.href = `kelas-siswa.html?id=${kelasId}`; return; }
  const tgl = (s) => (s ? new Date(s).toLocaleString('id-ID') : '—');
  // Helper Pertemuan 1–14
  const P = (x) => Math.min(14, Math.max(1, Number(x) || 1));
  const opsiPert = (sel) => Array.from({ length: 14 }, (_, i) => i + 1).map((n) => `<option value="${n}"${n === P(sel) ? ' selected' : ''}>Pertemuan ${n}</option>`).join('');
  const badgeP = (p) => `<span class="nb-badge pink">P${P(p)}</span>`;
  function grupPertemuan(list) {
    const g = {};
    list.forEach((it) => { const p = P(it.pertemuan); (g[p] = g[p] || []).push(it); });
    return Object.keys(g).sort((a, b) => a - b).map((p) => ({ p: Number(p), items: g[p] }));
  }
  let cacheMateri = [], cacheTugas = [], cacheKuis = [];
  ['fm_pert', 'ft_pert', 'fk_pert'].forEach((id) => { const el = document.getElementById(id); if (el) el.innerHTML = opsiPert(1); });

  try {
    const k = await apiFetch(`/kelas/${kelasId}`);
    document.getElementById('judul-kelas').textContent = k.nama_kelas;
    document.getElementById('deskripsi-kelas').textContent = k.deskripsi || '';
    document.getElementById('badge-siswa').textContent = k.jml_siswa + ' siswa';
    document.getElementById('kode-kelas').textContent = k.kode_kelas;
  } catch (e) { toast(e.message, 'red'); return; }

  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-copy-kode]')) {
      await navigator.clipboard.writeText(document.getElementById('kode-kelas').textContent).catch(() => {});
      toast('Kode kelas tersalin', 'green');
    }
  });

  // ---------- Modul / Materi ----------
  async function muatMateri() {
    try {
      const list = await apiFetch(`/kelas/${kelasId}/materi`);
      cacheMateri = list;
      document.getElementById('count-materi').textContent = list.length + ' modul';
      const box = document.getElementById('list-materi');
      const grup = grupPertemuan(list);
      box.innerHTML = grup.length ? '' : `<div class="nb-alert nb-alert-yellow">Belum ada modul.</div>`;
      grup.forEach(({ p, items }) => {
        const h = document.createElement('div');
        h.innerHTML = `<span class="nb-badge dark mb">PERTEMUAN ${p}</span>`;
        box.appendChild(h);
        items.forEach((m) => {
          const el = document.createElement('div');
          el.className = 'row mb';
          el.innerHTML = `<b>${esc(m.judul)}</b><span style="flex:1"></span>
            ${m.link_video ? `<a class="nb-btn nb-btn-sm nb-btn-pink" href="${esc(m.link_video)}" target="_blank">▶ Video</a>` : ''}
            ${m.file_path ? `<a class="nb-btn nb-btn-sm nb-btn-blue" href="${FILE_BASE_URL + m.file_path}" target="_blank">📎 File</a>` : ''}
            <button class="nb-btn nb-btn-sm" data-edit-materi="${m.id}">Ubah</button>
            <button class="nb-btn nb-btn-sm nb-btn-danger" data-hapus-materi="${m.id}">Hapus</button>`;
          if (m.deskripsi) { const d = document.createElement('div'); d.className = 'nb-hint'; d.style.width = '100%'; d.textContent = m.deskripsi; el.appendChild(d); }
          box.appendChild(el);
        });
      });
    } catch (e) { /* diam saat auto-refresh */ }
  }

  // Form edit inline modul
  function tampilEditMateri(id) {
    const m = cacheMateri.find((x) => x.id === Number(id));
    if (!m) return;
    const box = document.getElementById('list-materi');
    box.innerHTML = `<div class="nb-card"><div class="nb-card-body">
      <b>Ubah Modul → Pertemuan</b>
      <input id="em_judul" class="nb-input mt" value="${esc(m.judul)}" />
      <input id="em_deskripsi" class="nb-input mt" value="${esc(m.deskripsi || '')}" placeholder="Deskripsi" />
      <div class="row mt"><select id="em_pert" class="nb-select">${opsiPert(m.pertemuan)}</select>
      <button class="nb-btn nb-btn-sm nb-btn-primary" data-simpan-materi="${m.id}">Simpan</button>
      <button class="nb-btn nb-btn-sm" data-batal-edit>Batal</button></div></div></div>`;
  }

  document.getElementById('form-materi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('judul', fm_judul.value);
    form.append('deskripsi', fm_deskripsi.value);
    form.append('link_video', fm_video.value);
    form.append('pertemuan', document.getElementById('fm_pert').value);
    if (fm_file.files[0]) form.append('file', fm_file.files[0]);
    try {
      await apiFetch(`/kelas/${kelasId}/materi`, { method: 'POST', form });
      toast('Modul ditambahkan — siswa langsung dapat notifikasi', 'green');
      e.target.reset(); muatMateri();
    } catch (err) { toast(err.message, 'red'); }
  });

  // ---------- Tugas + penilaian ----------
  async function muatTugas() {
    try {
      const list = await apiFetch(`/kelas/${kelasId}/tugas`);
      cacheTugas = list;
      const box = document.getElementById('list-tugas');
      const grup = grupPertemuan(list);
      box.innerHTML = grup.length ? '' : `<div class="nb-alert nb-alert-yellow">Belum ada tugas.</div>`;
      grup.forEach(({ p, items }) => {
        const h = document.createElement('div');
        h.innerHTML = `<span class="nb-badge dark mb">PERTEMUAN ${p}</span>`;
        box.appendChild(h);
        items.forEach((t) => {
          const el = document.createElement('div');
          el.className = 'nb-card mb';
          el.innerHTML = `<div class="nb-card-body">
            <div class="row"><b>${esc(t.judul)}</b><span style="flex:1"></span>
            ${t.deadline ? `<span class="nb-badge red">⏰ ${tgl(t.deadline)}</span>` : ''}
            <span class="nb-badge blue">${t.terkumpul} terkumpul</span><span class="nb-badge yellow">${t.belum_dinilai} menunggu</span></div>
            ${t.deskripsi ? `<p class="nb-hint">${esc(t.deskripsi)}</p>` : ''}
            <div class="row mt"><button class="nb-btn nb-btn-sm" data-lihat-kumpul="${t.id}">Lihat Tugas Siswa</button>
            <button class="nb-btn nb-btn-sm" data-edit-tugas="${t.id}">Ubah</button>
            <button class="nb-btn nb-btn-sm nb-btn-danger" data-hapus-tugas="${t.id}">Hapus</button></div>
            <div class="kumpul-box mt"></div></div>`;
          box.appendChild(el);
        });
      });
    } catch (e) { toast(e.message, 'red'); }
  }

  function tampilEditTugas(id) {
    const t = cacheTugas.find((x) => x.id === Number(id));
    if (!t) return;
    const box = document.getElementById('list-tugas');
    box.innerHTML = `<div class="nb-card"><div class="nb-card-body">
      <b>Ubah Tugas → Pertemuan</b>
      <input id="et_judul" class="nb-input mt" value="${esc(t.judul)}" />
      <input id="et_deskripsi" class="nb-input mt" value="${esc(t.deskripsi || '')}" placeholder="Instruksi" />
      <div class="row mt"><select id="et_pert" class="nb-select">${opsiPert(t.pertemuan)}</select>
      <button class="nb-btn nb-btn-sm nb-btn-primary" data-simpan-tugas="${t.id}">Simpan</button>
      <button class="nb-btn nb-btn-sm" data-batal-edit>Batal</button></div></div></div>`;
  }

  async function muatPengumpulan(tugasId, box) {
    try {
      const list = await apiFetch(`/tugas/${tugasId}/pengumpulan`);
      if (!list.length) { box.innerHTML = `<div class="nb-alert nb-alert-yellow">Belum ada yang mengumpulkan.</div>`; return; }
      box.innerHTML = `<div class="nb-table-wrap"><table class="nb-table"><thead><tr><th>Siswa</th><th>Tipe</th><th>File/Kode</th><th>Nilai</th></tr></thead><tbody></tbody></table></div>`;
      const tb = box.querySelector('tbody');
      list.forEach((p) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><b>${esc(p.siswa_nama)}</b></td>
          <td><span class="nb-badge ${p.tipe === 'code' ? 'yellow' : 'blue'}">${p.tipe.toUpperCase()}${p.bahasa ? ' · ' + esc(p.bahasa) : ''}</span></td>
          <td>${p.file_path ? `<a href="${FILE_BASE_URL + p.file_path}" target="_blank"><b>⬇ Unduh</b></a>` : '—'}
            ${p.kode_program ? `<details><summary>Lihat kode</summary><pre class="mono" style="white-space:pre-wrap;font-size:12px">${esc(p.kode_program.slice(0, 2000))}</pre></details>` : ''}</td>
          <td>${p.status === 'dinilai' ? `<span class="nb-badge green">${p.nilai}</span>` : `
            <div class="row"><input id="nilai-${p.id}" type="number" min="0" max="100" class="nb-input" style="width:80px" placeholder="0-100" aria-label="Nilai" />
            <input id="fb-${p.id}" class="nb-input" style="flex:1;min-width:120px" placeholder="Feedback" aria-label="Feedback" />
            <button class="nb-btn nb-btn-sm nb-btn-primary" data-simpan-nilai="${p.id}">Simpan</button></div>`}</td>`;
        tb.appendChild(tr);
      });
    } catch (err) { toast(err.message, 'red'); }
  }

  document.getElementById('form-tugas').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await apiFetch(`/kelas/${kelasId}/tugas`, { method: 'POST', body: { judul: ft_judul.value, deskripsi: ft_deskripsi.value, deadline: ft_deadline.value || null, pertemuan: document.getElementById('ft_pert').value } });
      toast('Tugas dibuat', 'green'); e.target.reset(); muatTugas();
    } catch (err) { toast(err.message, 'red'); }
  });

  // ---------- Kuis + soal ----------
  async function muatKuis() {
    try {
      const list = await apiFetch(`/kelas/${kelasId}/kuis`);
      cacheKuis = list;
      const box = document.getElementById('list-kuis');
      const grup = grupPertemuan(list);
      box.innerHTML = grup.length ? '' : `<div class="nb-alert nb-alert-yellow">Belum ada kuis.</div>`;
      grup.forEach(({ p, items }) => {
        const h = document.createElement('div');
        h.innerHTML = `<span class="nb-badge dark mb">PERTEMUAN ${p}</span>`;
        box.appendChild(h);
        items.forEach((k) => {
          const el = document.createElement('div');
          el.className = 'nb-card mb';
          el.innerHTML = `<div class="nb-card-body"><div class="row"><b>${esc(k.judul)}</b><span style="flex:1"></span><span class="nb-badge blue">${k.jml_soal} soal</span>
            <button class="nb-btn nb-btn-sm" data-edit-kuis="${k.id}">Ubah</button></div>
            ${k.deskripsi ? `<p class="nb-hint">${esc(k.deskripsi)}</p>` : ''}<div class="kuis-box mt"></div></div>`;
          box.appendChild(el);
          renderKelolaKuis(k, el.querySelector('.kuis-box'));
        });
      });
    } catch (e) { toast(e.message, 'red'); }
  }

  function tampilEditKuis(id) {
    const k = cacheKuis.find((x) => x.id === Number(id));
    if (!k) return;
    const box = document.getElementById('list-kuis');
    box.innerHTML = `<div class="nb-card"><div class="nb-card-body">
      <b>Ubah Kuis → Pertemuan</b>
      <input id="ek_judul" class="nb-input mt" value="${esc(k.judul)}" />
      <div class="row mt"><select id="ek_pert" class="nb-select">${opsiPert(k.pertemuan)}</select>
      <button class="nb-btn nb-btn-sm nb-btn-primary" data-simpan-kuis="${k.id}">Simpan</button>
      <button class="nb-btn nb-btn-sm" data-batal-edit>Batal</button></div></div></div>`;
  }

  async function renderKelolaKuis(k, box) {
    const soal = await apiFetch(`/kuis/${k.id}/soal`).catch(() => []);
    const hasil = await apiFetch(`/kuis/${k.id}/hasil`).catch(() => []);
    box.innerHTML = `
      <b>Soal (${soal.length}):</b>
      ${soal.map((s, i) => `<div class="nb-hint">${i + 1}. ${esc(s.pertanyaan)} <b>[${s.kunci}]</b></div>`).join('') || '<div class="nb-hint">Belum ada soal.</div>'}
      <details class="mt"><summary><b>+ Tambah soal PG</b></summary>
        <input id="sq-${k.id}" class="nb-input mt" placeholder="Pertanyaan" />
        <div class="row mt"><input id="sa-${k.id}" class="nb-input" placeholder="Opsi A" /><input id="sb-${k.id}" class="nb-input" placeholder="Opsi B" /></div>
        <div class="row mt"><input id="sc-${k.id}" class="nb-input" placeholder="Opsi C" /><input id="sd-${k.id}" class="nb-input" placeholder="Opsi D" />
        <select id="sk-${k.id}" class="nb-select" style="max-width:110px"><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
        <button class="nb-btn nb-btn-sm nb-btn-primary mt" data-tambah-soal="${k.id}">Simpan Soal</button>
      </details>
      <div class="mt"><b>Hasil (${hasil.length}):</b> ${hasil.map((h) => `<span class="nb-badge green">${esc(h.siswa_nama)}: ${h.skor}</span>`).join(' ') || '<span class="nb-hint">Belum ada yang mengerjakan.</span>'}</div>`;
  }

  document.getElementById('form-kuis').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await apiFetch(`/kelas/${kelasId}/kuis`, { method: 'POST', body: { judul: fk_judul.value, deskripsi: fk_deskripsi.value, durasi_menit: fk_durasi.value || 30, deadline: fk_deadline.value || null, pertemuan: document.getElementById('fk_pert').value } });
      toast('Kuis dibuat', 'green'); e.target.reset(); muatKuis();
    } catch (err) { toast(err.message, 'red'); }
  });

  document.addEventListener('click', async (e) => {
    const q = (s) => e.target.closest(s);
    let b;
    if ((b = q('[data-edit-materi]'))) tampilEditMateri(b.dataset.editMateri);
    if ((b = q('[data-edit-tugas]'))) tampilEditTugas(b.dataset.editTugas);
    if ((b = q('[data-edit-kuis]'))) tampilEditKuis(b.dataset.editKuis);
    if ((b = q('[data-batal-edit]'))) { muatMateri(); muatTugas(); muatKuis(); }
    if ((b = q('[data-simpan-materi]'))) {
      try {
        await apiFetch(`/materi/${b.dataset.simpanMateri}`, { method: 'PUT', body: { judul: document.getElementById('em_judul').value, deskripsi: document.getElementById('em_deskripsi').value, pertemuan: document.getElementById('em_pert').value } });
        toast('Modul diperbarui ✓', 'green'); muatMateri();
      } catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-simpan-tugas]'))) {
      try {
        await apiFetch(`/tugas/${b.dataset.simpanTugas}`, { method: 'PUT', body: { judul: document.getElementById('et_judul').value, deskripsi: document.getElementById('et_deskripsi').value, pertemuan: document.getElementById('et_pert').value } });
        toast('Tugas diperbarui ✓', 'green'); muatTugas();
      } catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-simpan-kuis]'))) {
      try {
        await apiFetch(`/kuis/${b.dataset.simpanKuis}`, { method: 'PUT', body: { judul: document.getElementById('ek_judul').value, pertemuan: document.getElementById('ek_pert').value } });
        toast('Kuis diperbarui ✓', 'green'); muatKuis();
      } catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-hapus-materi]')) && confirm('Hapus modul ini?')) {
      try { await apiFetch(`/materi/${b.dataset.hapusMateri}`, { method: 'DELETE' }); muatMateri(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-lihat-kumpul]'))) muatPengumpulan(b.dataset.lihatKumpul, b.closest('.nb-card').querySelector('.kumpul-box'));
    if ((b = q('[data-hapus-tugas]')) && confirm('Hapus tugas ini?')) {
      try { await apiFetch(`/tugas/${b.dataset.hapusTugas}`, { method: 'DELETE' }); muatTugas(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-simpan-nilai]'))) {
      const pid = b.dataset.simpanNilai;
      try { await apiFetch(`/pengumpulan/${pid}/nilai`, { method: 'PUT', body: { nilai: Number(document.getElementById('nilai-' + pid).value), feedback: document.getElementById('fb-' + pid).value } }); toast('Nilai tersimpan ✓', 'green'); muatTugas(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-tambah-soal]'))) {
      const id = b.dataset.tambahSoal;
      const g = (x) => document.getElementById(x + '-' + id).value;
      try {
        await apiFetch(`/kuis/${id}/soal`, { method: 'POST', body: { pertanyaan: g('sq'), opsi_a: g('sa'), opsi_b: g('sb'), opsi_c: g('sc'), opsi_d: g('sd'), kunci: g('sk') } });
        toast('Soal ditambahkan', 'green'); muatKuis();
      } catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-ban]'))) {
      const alasan = prompt(`Kick/ban ${b.dataset.nama}? Alasan:`, '');
      if (alasan === null) return;
      try { await apiFetch(`/kelas/${kelasId}/ban`, { method: 'POST', body: { siswa_id: b.dataset.ban, alasan } }); toast('Siswa dikeluarkan + diblokir', 'green'); muatModerasi(); muatAnggota(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-unban]')) && confirm('Buka blokir siswa ini?')) {
      try { await apiFetch(`/kelas/${kelasId}/ban/${b.dataset.unban}`, { method: 'DELETE' }); toast('Blokir dibuka', 'green'); muatModerasi(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-akses-setuju]'))) {
      try { await apiFetch(`/permintaan-akses/${b.dataset.aksesSetuju}`, { method: 'PUT', body: { keputusan: 'setuju' } }); toast('Akses disetujui ✓', 'green'); muatModerasi(); muatAnggota(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-akses-tolak]'))) {
      try { await apiFetch(`/permintaan-akses/${b.dataset.aksesTolak}`, { method: 'PUT', body: { keputusan: 'tolak' } }); toast('Permintaan ditolak', 'yellow'); muatModerasi(); }
      catch (err) { toast(err.message, 'red'); }
    }
  });

  // ---------- Anggota + moderasi + pengumuman ----------
  async function muatAnggota() {
    try {
      const list = await apiFetch(`/kelas/${kelasId}/anggota`);
      document.getElementById('list-anggota').innerHTML = list.length
        ? list.map((a) => `<div class="row mb"><b>${esc(a.nama)}</b><span class="nb-hint">${esc(a.email)}</span>${a.status !== 'aktif' ? `<span class="nb-badge yellow">keluar</span>` : ''}<span style="flex:1"></span>
            <a class="nb-btn nb-btn-sm" href="kelas-siswa.html?id=${kelasId}" title="Lihat sebagai siswa">👁 Pantau</a>
            <button class="nb-btn nb-btn-sm nb-btn-danger" data-ban="${a.id}" data-nama="${esc(a.nama)}">Kick/Ban</button></div>`).join('')
        : `<div class="nb-hint">Belum ada siswa. Bagikan kode kelas!</div>`;
    } catch (e) { toast(e.message, 'red'); }
  }

  async function muatModerasi() {
    try {
      const { banned, pending } = await apiFetch(`/kelas/${kelasId}/moderasi`);
      document.getElementById('list-minta-akses').innerHTML = pending.length
        ? pending.map((r) => `<div class="row mb"><b>${esc(r.nama)}</b><span class="nb-hint">${esc(r.email)}</span><span style="flex:1"></span>
            <button class="nb-btn nb-btn-sm nb-btn-green" data-akses-setuju="${r.id}">Setujui</button>
            <button class="nb-btn nb-btn-sm nb-btn-danger" data-akses-tolak="${r.id}">Tolak</button></div>`).join('')
        : `<div class="nb-hint">Tidak ada permintaan.</div>`;
      document.getElementById('list-banned').innerHTML = banned.length
        ? banned.map((b) => `<div class="row mb"><b>${esc(b.nama)}</b><span class="nb-hint">${esc(b.alasan || 'tanpa alasan')}</span><span style="flex:1"></span>
            <button class="nb-btn nb-btn-sm" data-unban="${b.siswa_id}">Buka Blokir</button></div>`).join('')
        : `<div class="nb-hint">Tidak ada yang diblokir.</div>`;
    } catch (e) { toast(e.message, 'red'); }
  }

  document.getElementById('form-pengumuman').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/kelas/${kelasId}/pengumuman`, { method: 'POST', body: { isi: fp_isi.value } });
      toast('📢 Pengumuman terkirim ke semua anggota', 'green');
      e.target.reset();
    } catch (err) { toast(err.message, 'red'); }
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
          <button class="nb-btn nb-btn-sm nb-btn-danger" data-hapus-diskusi="${d.id}">Hapus</button></div>
        </div>${render(d.balasan || [], dalam + 1)}`).join('');
      box.innerHTML = tree.length ? render(tree) : `<div class="nb-alert nb-alert-yellow">Belum ada diskusi.</div>`;
    } catch (e) { /* diam saat auto-refresh */ }
  }

  document.getElementById('form-diskusi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isi = fd_isi.value.trim();
    if (!isi) return;
    try {
      await apiFetch(`/kelas/${kelasId}/diskusi`, { method: 'POST', body: { isi, parent_id: fd_parent.value || null } });
      fd_isi.value = ''; fd_parent.value = ''; muatDiskusi();
    } catch (err) { toast(err.message, 'red'); }
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-balas]');
    if (b) { fd_parent.value = b.dataset.balas; fd_isi.focus(); }
    const ha = e.target.closest('[data-hapus-semua-diskusi]');
    if (ha && confirm('Hapus SELURUH chat kelas ini? Berlaku juga di halaman siswa dan tidak bisa dibatalkan.')) {
      try {
        const r = await apiFetch(`/kelas/${kelasId}/diskusi`, { method: 'DELETE' });
        toast(`🗑 ${r.dihapus} chat dihapus (termasuk di halaman siswa) ✓`, 'green');
        muatDiskusi();
      } catch (err) { toast(err.message, 'red'); }
    }
    const h = e.target.closest('[data-hapus-diskusi]');
    if (h && confirm('Hapus pesan ini?')) {
      try { await apiFetch(`/diskusi/${h.dataset.hapusDiskusi}`, { method: 'DELETE' }); muatDiskusi(); }
      catch (err) { toast(err.message, 'red'); }
    }
  });

  muatMateri(); muatTugas(); muatKuis(); muatDiskusi(); muatAnggota(); muatModerasi();
  setInterval(() => { muatMateri(); muatDiskusi(); }, 10000);
  dengarRefresh(() => { muatMateri(); muatTugas(); muatKuis(); muatDiskusi(); });
})();
