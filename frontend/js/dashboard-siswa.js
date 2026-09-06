// Dashboard Siswa: statistik + kelas diikuti + tugas deadline + nilai.
(async () => {
  const user = await requireAuth();
  // Validasi status banned saat masuk
  if (user.banned_dari && user.banned_dari.length) {
    const w = document.getElementById('ban-warning');
    w.style.display = 'block';
    w.innerHTML = `⛔ Kamu diblokir dari: <b>${user.banned_dari.map(esc).join(', ')}</b>. Minta akses kembali via halaman Class.`;
  }
  try {
    const p = await apiFetch('/pengaturan');
    document.getElementById('sambutan-tampil').textContent = p.sambutan || '';
  } catch {}
  // Grid kontribusi 10 minggu (70 hari)
  try {
    const ringkas = await apiFetch('/aktivitas/ringkas');
    const g = document.getElementById('grid-kontribusi');
    g.innerHTML = '';
    const warna = (n) => !n ? '#fff' : n === 1 ? '#FFF3BF' : n <= 3 ? '#FFC900' : '#23D46B';
    for (let i = 69; i >= 0; i--) {
      const t = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      const n = ringkas[t] || 0;
      const d = document.createElement('div');
      d.title = `${t}: ${n} aktivitas`;
      d.style.cssText = `aspect-ratio:1;background:${warna(n)};border:2px solid var(--ink);border-radius:3px`;
      g.appendChild(d);
    }
  } catch {}
  // Pengumuman sistem
  try {
    const list = await apiFetch('/pengumuman');
    document.getElementById('list-pengumuman').innerHTML = list.length
      ? list.slice(0, 3).map((p) => `<div class="nb-alert nb-alert-yellow mb"><b>${esc(p.judul)}</b><div>${esc(p.isi)}</div></div>`).join('')
      : `<div class="nb-hint">Belum ada pengumuman.</div>`;
  } catch {}
  try {
    const dash = await apiFetch('/dashboard/siswa');
    document.getElementById('stat-kelas').textContent = dash.total_kelas;
    document.getElementById('stat-tugas').textContent = dash.tugas_mendatang.length;
    const nilai = dash.nilai_terakhir;
    document.getElementById('stat-nilai').textContent = nilai.length ? Math.round(nilai.reduce((a, b) => a + b.nilai, 0) / nilai.length) : '—';

    const boxT = document.getElementById('tugas-dekat');
    boxT.innerHTML = dash.tugas_mendatang.length
      ? dash.tugas_mendatang.map((t) => `<div class="row mb"><span class="nb-badge red">⏰ ${esc(t.deadline ? new Date(t.deadline).toLocaleDateString('id-ID') : 'tanpa deadline')}</span><b>${esc(t.judul)}</b><span class="nb-hint">${esc(t.nama_kelas)}</span></div>`).join('')
      : `<div class="nb-alert nb-alert-green">✓ Tidak ada tugas menggantung. Santai!</div>`;

    const boxN = document.getElementById('nilai-terakhir');
    boxN.innerHTML = nilai.length
      ? nilai.map((n) => `<div class="row mb"><span class="nb-badge green">${n.nilai}</span><b>${esc(n.tugas_judul)}</b><span class="nb-hint">${esc(n.nama_kelas)}${n.feedback ? ' — “' + esc(n.feedback) + '”' : ''}</span></div>`).join('')
      : `<div class="nb-alert nb-alert-yellow">Belum ada nilai. Kumpulkan tugas dulu!</div>`;
  } catch (e) { toast(e.message, 'red'); }

  try {
    const list = await apiFetch('/kelas');
    const box = document.getElementById('list-kelas');
    const kartu = list.map((k, i) => `
      <div class="nb-card nb-card-hover">
        <div class="nb-card-header ${['yellow', 'blue', 'pink', 'green'][i % 4]}">${esc(k.nama_kelas)}</div>
        <div class="nb-card-body">
          <div class="mono nb-hint">${esc(k.kode_kelas)} · ${esc(k.mentor_nama || '')}</div>
          <div class="row mt"><a class="nb-btn nb-btn-sm nb-btn-dark" href="kelas-siswa.html?id=${k.id}">Masuk Kelas</a></div>
        </div>
      </div>`).join('');
    box.innerHTML = kartu + `
      <div class="nb-card" style="border-style:dashed"><div class="nb-card-body" style="text-align:center">
        <div style="font-size:32px">🔑</div><b>Gabung kelas baru?</b>
        <p class="nb-hint">Minta kode ke mentor, lalu input.</p>
        <a class="nb-btn nb-btn-primary nb-btn-block" href="gabung-kelas.html">Input Kode</a>
      </div></div>`;
  } catch (e) { toast(e.message, 'red'); }
  dengarRefresh(() => location.reload()); // tab lain mengubah data → refresh otomatis
})();
