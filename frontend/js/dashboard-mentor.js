// Dashboard Mentor: statistik + daftar kelas + buat kelas.
(async () => {
  const user = await requireAuth();

  async function muat() {
    try {
      const dash = await apiFetch('/dashboard/mentor');
      document.getElementById('stat-kelas').textContent = dash.total_kelas;
      document.getElementById('stat-siswa').textContent = dash.total_siswa;
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
            <div class="row mt">
              <a class="nb-btn nb-btn-sm nb-btn-dark" href="kelas-detail.html?id=${k.id}">Buka</a>
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
      document.getElementById('in-email').value = p.kontak_email || '';
    } catch {}
  }
  document.getElementById('form-sambutan').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const v = (id) => document.getElementById(id).value;
      for (const [kunci, nilai] of [['sambutan', v('in-sambutan')], ['kontak_wa', v('in-wa')], ['kontak_ig', v('in-ig')], ['kontak_email', v('in-email')]]) {
        await apiFetch('/pengaturan', { method: 'PUT', body: { kunci, nilai } });
      }
      toast('Sambutan & kontak tersimpan ✓', 'green'); muatSambutan();
    } catch (err) { toast(err.message, 'red'); }
  });

  dengarRefresh(muat); // tab lain mengubah data → refresh otomatis
  muat(); muatGrafik(); muatSambutan();
})();
