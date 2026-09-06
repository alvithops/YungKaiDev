// Dashboard Mentor: statistik + daftar kelas + buat kelas.
(async () => {
  const user = await requireAuth();

  async function muat() {
    try {
      const dash = await apiFetch('/dashboard/mentor');
      document.getElementById('stat-kelas').textContent = dash.total_kelas;
      document.getElementById('stat-siswa').textContent = `${dash.total_siswa} (🟢 ${dash.online} online)`;
      document.getElementById('stat-tugas').textContent = dash.tugas_belum_dinilai;
      document.getElementById('stat-kuis').textContent = dash.kuis_aktif;
      document.getElementById('badge-tugas').textContent = '● ' + dash.tugas_belum_dinilai + ' perlu dinilai';
    } catch (e) { toast(e.message, 'red'); }

    try {
      const list = await apiFetch('/kelas');
      const box = document.getElementById('list-kelas');
      if (!list.length) {
        box.innerHTML = `<div class="nb-alert nb-alert-yellow">Belum ada kelas. Buat kelas pertama → dapat kode → bagikan ke siswa.</div>`;
        return;
      }
      box.innerHTML = '';
      const colors = ['yellow', 'blue', 'pink', 'green'];
      list.forEach((k, i) => {
        const c = colors[i % colors.length];
        const el = document.createElement('div');
        el.className = 'nb-card nb-card-hover';
        el.style.cssText = 'flex:1;min-width:220px';
        el.innerHTML = `
          <div class="nb-card-header ${c}"><span>${esc(k.nama_kelas)}</span></div>
          <div class="nb-card-body">
            <span class="nb-code">${esc(k.kode_kelas)}</span>
            <div class="row mt"><span class="nb-badge blue">${k.jml_siswa} siswa</span><span class="nb-badge blue">${k.jml_tugas} tugas</span><span class="nb-badge pink">${k.jml_kuis} kuis</span>${k.perlu_dinilai ? `<span class="nb-badge yellow">● ${k.perlu_dinilai} perlu dinilai</span>` : `<span class="nb-badge green">✓ nilai aman</span>`}</div>
            <div class="row mt">
              <a class="nb-btn nb-btn-sm nb-btn-dark" href="kelas-mentor.html?id=${k.id}">Buka</a>
              <button class="nb-btn nb-btn-sm" data-copy="${esc(k.kode_kelas)}">Copy</button>
              <button class="nb-btn nb-btn-sm" data-regen="${k.id}" title="Buat kode baru">↻ Kode</button>
              <button class="nb-btn nb-btn-sm nb-btn-danger" data-hapus="${k.id}">Hapus</button>
            </div>
          </div>`;
        box.appendChild(el);
      });
    } catch (e) { toast(e.message, 'red'); }
  }

  document.addEventListener('click', async (e) => {
    const cp = e.target.closest('[data-copy]');
    if (cp) { await navigator.clipboard.writeText(cp.dataset.copy).catch(() => {}); toast('Kode tersalin: ' + cp.dataset.copy, 'green'); }
    const rg = e.target.closest('[data-regen]');
    if (rg && confirm('Buat kode baru? Kode lama tidak berlaku lagi.')) {
      try { const k = await apiFetch(`/kelas/${rg.dataset.regen}/regenerate`, { method: 'POST' }); toast('Kode baru: ' + k.kode_kelas, 'green'); muat(); }
      catch (err) { toast(err.message, 'red'); }
    }
    const hp = e.target.closest('[data-hapus]');
    if (hp && confirm('Hapus kelas beserta isinya?')) {
      try { await apiFetch(`/kelas/${hp.dataset.hapus}`, { method: 'DELETE' }); toast('Kelas dihapus', 'green'); muat(); }
      catch (err) { toast(err.message, 'red'); }
    }
  });

  document.getElementById('form-kelas').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const k = await apiFetch('/kelas', { method: 'POST', body: { nama_kelas: bk_nama.value, deskripsi: bk_deskripsi.value } });
      toast('Kelas dibuat! Kode: ' + k.kode_kelas, 'green');
      bk_nama.value = ''; bk_deskripsi.value = '';
      muat();
    } catch (err) { toast(err.message, 'red'); }
  });

  // Grafik pendaftaran 14 hari (bar murni CSS) + teks sambutan
  async function muatGrafik() {
    try {
      const data = await apiFetch('/dashboard/mentor/grafik');
      const maks = Math.max(1, ...data.map((d) => d.pendaftar));
      document.getElementById('grafik').innerHTML = data.map((d) => `
        <div style="flex:1;text-align:center" title="${d.tanggal}: ${d.pendaftar}">
          <div style="font-weight:800">${d.pendaftar || ''}</div>
          <div style="height:${Math.round((d.pendaftar / maks) * 90) + 4}px;background:var(--primary);border:2px solid var(--ink);border-radius:4px"></div>
          <div class="nb-hint" style="font-size:10px">${d.tanggal.slice(5)}</div>
        </div>`).join('');
    } catch (e) { document.getElementById('grafik').innerHTML = `<div class="nb-hint">Gagal memuat grafik.</div>`; }
  }
  async function muatSambutan() {
    try {
      const p = await apiFetch('/pengaturan');
      document.getElementById('sambutan-tampil').textContent = p.sambutan || '';
      document.getElementById('in-sambutan').value = p.sambutan || '';
      document.getElementById('in-wa').value = p.kontak_wa || '';
      document.getElementById('in-ig').value = p.kontak_ig || '';
      document.getElementById('in-email').value = p.kontak_github || '';
    } catch {}
  }
  document.getElementById('form-sambutan').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const v = (id) => document.getElementById(id).value;
      for (const [kunci, nilai] of [['sambutan', v('in-sambutan')], ['kontak_wa', v('in-wa')], ['kontak_ig', v('in-ig')], ['kontak_github', v('in-email')]]) {
        await apiFetch('/pengaturan', { method: 'PUT', body: { kunci, nilai } });
      }
      toast('Sambutan & kontak tersimpan ✓', 'green'); muatSambutan();
    } catch (err) { toast(err.message, 'red'); }
  });

  // Feed + siswa aktif: cerminan live data halaman siswa
  async function muatAktivitas() {
    try {
      const { feed, aktif } = await apiFetch('/dashboard/mentor/aktivitas');
      const ikon = { tugas: '📥', kuis: '📝', diskusi: '💬', gabung: '🔑', daftar: '🎓' };
      document.getElementById('feed-aktivitas').innerHTML = feed.length ? feed.map((f) => `
        <div class="row mb"><span>${ikon[f.jenis] || '•'}</span><div><b>${esc(f.siapa)}</b>
        ${f.jenis === 'tugas' ? (f.extra === 'dinilai' ? 'tugasnya sudah dinilai' : 'mengumpulkan tugas') : f.jenis === 'kuis' ? 'mengerjakan kuis' : f.jenis === 'diskusi' ? 'berdiskusi' : f.jenis === 'daftar' ? 'mendaftar akun baru' : 'gabung kelas'}:
        <b>${esc(f.objek)}</b>${f.extra && f.jenis === 'kuis' ? ` (${esc(f.extra)})` : ''}<br>
        <span class="nb-hint">${f.nama_kelas ? esc(f.nama_kelas) + ' · ' : ''}${new Date(f.waktu).toLocaleString('id-ID')}</span></div></div>`).join('')
        : `<div class="nb-hint">Belum ada aktivitas siswa.</div>`;
      document.getElementById('siswa-aktif').innerHTML = aktif.length ? aktif.map((s) => `
        <div class="row mb">${s.online ? `<span class="nb-badge green">● ONLINE</span>` : `<span class="nb-badge yellow">○ offline</span>`}<b>${esc(s.nama)}</b><span style="flex:1"></span>
        <span class="nb-badge blue">${s.total}x aktivitas</span>
        <span class="nb-hint">${s.terakhir ? new Date(s.terakhir).toLocaleString('id-ID') : 'belum pernah'}</span></div>`).join('')
        : `<div class="nb-hint">Belum ada aktivitas.</div>`;
    } catch { /* diam saat auto-refresh */ }
  }

  dengarRefresh(() => { muat(); muatAktivitas(); }); // tab lain mengubah data → refresh otomatis
  setInterval(() => { muat(); muatGrafik(); muatAktivitas(); }, 5000); // ikuti data siswa lintas perangkat (±5 dtk)
  muat(); muatGrafik(); muatSambutan(); muatAktivitas();
})();
