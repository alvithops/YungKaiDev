// Lonceng notifikasi: inbox siswa/mentor terisi otomatis saat mentor
// menambah materi/tugas/kuis/pengumuman atau menilai (lihat utils/notifikasi.js).
// Polling 10 detik + refresh instan lintas-tab via event pkl:refresh.
async function muatNotifikasi() {
  const count = document.getElementById('bell-count');
  const list = document.getElementById('bell-list');
  if (!count || !list) return;
  try {
    const { belum_baca } = await apiFetch('/notifikasi/belum-baca');
    count.textContent = belum_baca;
    count.style.display = belum_baca ? '' : 'none';
    if (document.getElementById('bell-panel').style.display === 'block') {
      const rows = await apiFetch('/notifikasi');
      list.innerHTML = rows.length ? '' : `<div class="nb-hint">Belum ada notifikasi.</div>`;
      rows.forEach((n) => {
        const el = document.createElement('div');
        el.className = 'nb-alert mb ' + (n.dibaca ? 'nb-alert-blue' : 'nb-alert-yellow');
        el.innerHTML = `<b>${esc(n.judul)}</b><div>${esc(n.isi || '')}</div>
          <div class="nb-hint">${esc(n.nama_kelas || '')} · ${new Date(n.created_at).toLocaleString('id-ID')}</div>`;
        list.appendChild(el);
      });
    }
  } catch { /* abaikan saat offline; cache api.js yang bicara */ }
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('#btn-bell')) {
    const p = document.getElementById('bell-panel');
    p.style.display = p.style.display === 'block' ? 'none' : 'block';
    if (p.style.display === 'block') {
      document.getElementById('bell-list').innerHTML = `<div class="nb-hint">Memuat...</div>`;
      await muatNotifikasi();
    }
  } else if (e.target.closest('#btn-baca-semua')) {
    try { await apiFetch('/notifikasi/baca-semua', { method: 'PUT' }); muatNotifikasi(); }
    catch (err) { toast(err.message, 'red'); }
  } else if (!e.target.closest('#bell-panel')) {
    const p = document.getElementById('bell-panel');
    if (p) p.style.display = 'none';
  }
});

muatNotifikasi();
setInterval(muatNotifikasi, 10000);
dengarRefresh(muatNotifikasi);
