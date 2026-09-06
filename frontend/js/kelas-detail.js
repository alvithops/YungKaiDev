// Kelas Detail: materi + tugas (file/kode) + penilaian + kuis + diskusi + anggota.
// Auto-refresh materi & diskusi tiap 10 detik (real-time sederhana).
(async () => {
  const user = await requireAuth();
  const kelasId = new URLSearchParams(location.search).get('id');
  if (!kelasId) { location.href = user.role === 'mentor' ? 'dashboard-mentor.html' : 'dashboard-siswa.html'; return; }
  const mentorAsli = user.role === 'mentor';
  // Mode pantau (dari referensi): mentor melihat tampilan persis milik siswa (?view=siswa).
  // isMentor dibuat efektif-false agar SELURUH render + guard form ikut mode siswa.
  const pantauSiswa = new URLSearchParams(location.search).get('view') === 'siswa' && mentorAsli;
  const isMentor = mentorAsli && !pantauSiswa;
  const tgl = (s) => (s ? new Date(s).toLocaleString('id-ID') : '—');

  // ---------- Header kelas ----------
  try {
    const k = await apiFetch(`/kelas/${kelasId}`);
    document.getElementById('judul-kelas').textContent = k.nama_kelas;
    document.getElementById('deskripsi-kelas').textContent = k.deskripsi || '';
    document.getElementById('badge-siswa').textContent = k.jml_siswa + ' siswa';
    document.getElementById('kode-kelas').textContent = k.kode_kelas;
    document.getElementById('link-dash').href = mentorAsli ? 'dashboard-mentor.html' : 'dashboard-siswa.html';
    if (!isMentor || pantauSiswa) document.querySelectorAll('.mentor-only').forEach((el) => el.remove());
    if (pantauSiswa) {
      const banner = document.createElement('div');
      banner.className = 'nb-alert nb-alert-yellow mb';
      banner.innerHTML = `👁 <b>Mode pantau:</b> kamu melihat tampilan siswa (read-only). <a href="kelas-detail.html?id=${kelasId}"><b>Kembali ke mode mentor</b></a>`;
      document.querySelector('.content').prepend(banner);
    }
  } catch (e) { toast(e.message, 'red'); return; }

  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-copy-kode]')) {
      await navigator.clipboard.writeText(document.getElementById('kode-kelas').textContent).catch(() => {});
      toast('Kode kelas tersalin', 'green');
    }
  });

  // ---------- Materi ----------
  async function muatMateri() {
    try {
      const list = await apiFetch(`/kelas/${kelasId}/materi`);
      document.getElementById('count-materi').textContent = list.length + ' modul';
      const box = document.getElementById('list-materi');
      box.innerHTML = list.length ? '' : `<div class="nb-alert nb-alert-yellow">Belum ada materi.</div>`;
      list.forEach((m, i) => {
        const el = document.createElement('div');
        el.className = 'row mb';
        el.innerHTML = `<b>${i + 1}. ${esc(m.judul)}</b><span style="flex:1"></span>
          ${m.link_video ? `<a class="nb-btn nb-btn-sm nb-btn-pink" href="${esc(m.link_video)}" target="_blank">▶ Video</a>` : ''}
          ${m.file_path ? `<a class="nb-btn nb-btn-sm nb-btn-blue" href="${FILE_BASE_URL + m.file_path}" target="_blank">📎 File</a>` : ''}
          ${isMentor ? `<button class="nb-btn nb-btn-sm nb-btn-danger" data-hapus-materi="${m.id}">Hapus</button>` : ''}`;
        if (m.deskripsi) { const p = document.createElement('div'); p.className = 'nb-hint'; p.style.width = '100%'; p.textContent = m.deskripsi; el.appendChild(p); }
        box.appendChild(el);
      });
    } catch (e) { /* diam saat auto-refresh */ }
  }

  if (isMentor) {
    document.getElementById('form-materi').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData();
      form.append('judul', fm_judul.value);
      form.append('deskripsi', fm_deskripsi.value);
      form.append('link_video', fm_video.value);
      if (fm_file.files[0]) form.append('file', fm_file.files[0]);
      try {
        await apiFetch(`/kelas/${kelasId}/materi`, { method: 'POST', form });
        toast('Materi ditambahkan', 'green');
        e.target.reset(); muatMateri();
      } catch (err) { toast(err.message, 'red'); }
    });
    document.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-hapus-materi]');
      if (b && confirm('Hapus materi ini?')) {
        try { await apiFetch(`/materi/${b.dataset.hapusMateri}`, { method: 'DELETE' }); muatMateri(); }
        catch (err) { toast(err.message, 'red'); }
      }
    });
  }

  // ---------- Tugas ----------
  async function muatTugas() {
    try {
      const list = await apiFetch(`/kelas/${kelasId}/tugas`);
      const box = document.getElementById('list-tugas');
      box.innerHTML = list.length ? '' : `<div class="nb-alert nb-alert-yellow">Belum ada tugas.</div>`;
      for (const t of list) {
        const el = document.createElement('div');
        el.className = 'nb-card mb';
        el.innerHTML = `<div class="nb-card-body">
          <div class="row"><b>${esc(t.judul)}</b><span style="flex:1"></span>
          ${t.deadline ? `<span class="nb-badge red">⏰ ${tgl(t.deadline)}</span>` : ''}
          ${isMentor ? `<span class="nb-badge blue">${t.terkumpul} terkumpul</span><span class="nb-badge yellow">${t.belum_dinilai} menunggu</span>` : (t.saya ? (t.saya.status === 'dinilai' ? `<span class="nb-badge green">✓ ${t.saya.nilai}</span>` : `<span class="nb-badge yellow">● Terkumpul</span>`) : `<span class="nb-badge red">Belum kumpul</span>`)}
          </div>
          ${t.deskripsi ? `<p class="nb-hint">${esc(t.deskripsi)}</p>` : ''}
          <div class="tugas-aksi"></div>
        </div>`;
        const aksi = el.querySelector('.tugas-aksi');
        if (isMentor) {
          aksi.innerHTML = `<div class="row mt"><button class="nb-btn nb-btn-sm" data-lihat-kumpul="${t.id}">Lihat Pengumpulan</button>
            <button class="nb-btn nb-btn-sm nb-btn-danger" data-hapus-tugas="${t.id}">Hapus</button></div><div class="kumpul-box mt"></div>`;
        } else if (!t.saya || t.saya.status !== 'dinilai') {
          aksi.innerHTML = `
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
            ${t.saya?.feedback ? `<div class="nb-alert nb-alert-blue mt">🗨 Feedback: ${esc(t.saya.feedback)}</div>` : ''}`;
        } else {
          aksi.innerHTML = `<div class="nb-alert nb-alert-green mt">✓ Nilai: <b>${t.saya.nilai}</b>${t.saya.feedback ? ' — “' + esc(t.saya.feedback) + '”' : ''}</div>`;
        }
        box.appendChild(el);
      }
    } catch (e) { toast(e.message, 'red'); }
  }

  document.addEventListener('click', async (e) => {
    const q = (s) => e.target.closest(s);
    let b;
    if ((b = q('[data-kumpul-kode-toggle]'))) {
      const box = document.getElementById('kodebox-' + b.dataset.kumpulKodeToggle);
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }
    if ((b = q('[data-kumpul-file]'))) {
      const id = b.dataset.kumpulFile;
      const f = document.getElementById('file-' + id).files[0];
      if (!f) return toast('Pilih file dulu', 'red');
      const form = new FormData(); form.append('file', f);
      b.disabled = true;
      try { await apiFetch(`/tugas/${id}/kumpul`, { method: 'POST', form }); toast('File terkumpul ✓', 'green'); muatTugas(); }
      catch (err) { toast(err.message, 'red'); } finally { b.disabled = false; }
    }
    if ((b = q('[data-kumpul-kode]'))) {
      const id = b.dataset.kumpulKode;
      const kode = document.getElementById('kode-' + id).value;
      const bahasa = document.getElementById('lang-' + id).value;
      if (!kode.trim()) return toast('Kode masih kosong', 'red');
      b.disabled = true;
      try { await apiFetch(`/tugas/${id}/kumpul`, { method: 'POST', body: { tipe: 'code', bahasa, kode_program: kode } }); toast('Kode terkumpul ✓', 'green'); muatTugas(); }
      catch (err) { toast(err.message, 'red'); } finally { b.disabled = false; }
    }
    if ((b = q('[data-lihat-kumpul]'))) muatPengumpulan(b.dataset.lihatKumpul, b.closest('.nb-card').querySelector('.kumpul-box'));
    if ((b = q('[data-hapus-tugas]')) && confirm('Hapus tugas ini?')) {
      try { await apiFetch(`/tugas/${b.dataset.hapusTugas}`, { method: 'DELETE' }); muatTugas(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-simpan-nilai]'))) {
      const pid = b.dataset.simpanNilai;
      const nilai = Number(document.getElementById('nilai-' + pid).value);
      const feedback = document.getElementById('fb-' + pid).value;
      try { await apiFetch(`/pengumpulan/${pid}/nilai`, { method: 'PUT', body: { nilai, feedback } }); toast('Nilai tersimpan ✓', 'green'); muatTugas(); }
      catch (err) { toast(err.message, 'red'); }
    }
  });

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

  if (isMentor) {
    document.getElementById('form-tugas').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await apiFetch(`/kelas/${kelasId}/tugas`, { method: 'POST', body: { judul: ft_judul.value, deskripsi: ft_deskripsi.value, deadline: ft_deadline.value || null } });
        toast('Tugas dibuat', 'green'); e.target.reset(); muatTugas();
      } catch (err) { toast(err.message, 'red'); }
    });
  }

  // ---------- Kuis ----------
  async function muatKuis() {
    try {
      const list = await apiFetch(`/kelas/${kelasId}/kuis`);
      const box = document.getElementById('list-kuis');
      box.innerHTML = list.length ? '' : `<div class="nb-alert nb-alert-yellow">Belum ada kuis.</div>`;
      list.forEach((k) => {
        const el = document.createElement('div');
        el.className = 'nb-card mb';
        el.innerHTML = `<div class="nb-card-body">
          <div class="row"><b>${esc(k.judul)}</b><span style="flex:1"></span><span class="nb-badge blue">${k.jml_soal} soal</span>
          ${!isMentor ? (k.saya ? `<span class="nb-badge green">Skor: ${k.saya.skor}</span>` : `<button class="nb-btn nb-btn-sm nb-btn-primary" data-mulai-kuis="${k.id}">Mulai →</button>`) : ''}</div>
          ${k.deskripsi ? `<p class="nb-hint">${esc(k.deskripsi)}</p>` : ''}
          <div class="kuis-box mt"></div></div>`;
        box.appendChild(el);
        if (isMentor) renderKelolaKuis(k, el.querySelector('.kuis-box'));
      });
    } catch (e) { toast(e.message, 'red'); }
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

  document.addEventListener('click', async (e) => {
    const q = (s) => e.target.closest(s);
    let b;
    if ((b = q('[data-tambah-soal]'))) {
      const id = b.dataset.tambahSoal;
      const g = (x) => document.getElementById(x + '-' + id).value;
      try {
        await apiFetch(`/kuis/${id}/soal`, { method: 'POST', body: { pertanyaan: g('sq'), opsi_a: g('sa'), opsi_b: g('sb'), opsi_c: g('sc'), opsi_d: g('sd'), kunci: g('sk') } });
        toast('Soal ditambahkan', 'green'); muatKuis();
      } catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-mulai-kuis]'))) mulaiKuis(b.dataset.mulaiKuis, b.closest('.nb-card').querySelector('.kuis-box'));
    if ((b = q('[data-kirim-kuis]'))) {
      const id = b.dataset.kirimKuis;
      const jawaban = {};
      document.querySelectorAll(`[data-jawab="${id}"]:checked`).forEach((r) => { jawaban[r.name.split('-')[1]] = r.value; });
      try {
        const h = await apiFetch(`/kuis/${id}/submit`, { method: 'POST', body: { jawaban } });
        toast(`Skor: ${h.skor} (${h.benar}/${h.total} benar)`, 'green'); muatKuis();
      } catch (err) { toast(err.message, 'red'); }
    }
  });

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

  if (isMentor) {
    document.getElementById('form-kuis').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await apiFetch(`/kelas/${kelasId}/kuis`, { method: 'POST', body: { judul: fk_judul.value, deskripsi: fk_deskripsi.value, durasi_menit: fk_durasi.value || 30, deadline: fk_deadline.value || null } });
        toast('Kuis dibuat', 'green'); e.target.reset(); muatKuis();
      } catch (err) { toast(err.message, 'red'); }
    });
  }

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
          ${(d.user_id === user.id || isMentor) ? `<button class="nb-btn nb-btn-sm nb-btn-danger" data-hapus-diskusi="${d.id}">Hapus</button>` : ''}</div>
        </div>${render(d.balasan || [], dalam + 1)}`).join('');
      box.innerHTML = tree.length ? render(tree) : `<div class="nb-alert nb-alert-yellow">Belum ada diskusi. Mulai duluan!</div>`;
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
    if (b) { fd_parent.value = b.dataset.balas; fd_isi.focus(); toast('Membalas pesan #' + b.dataset.balas, 'blue'); }
    const h = e.target.closest('[data-hapus-diskusi]');
    if (h && confirm('Hapus pesan ini?')) {
      try { await apiFetch(`/diskusi/${h.dataset.hapusDiskusi}`, { method: 'DELETE' }); muatDiskusi(); }
      catch (err) { toast(err.message, 'red'); }
    }
  });

  // ---------- Anggota + moderasi (mentor): pantau, kick/ban, unban, setujui akses ----------
  async function muatModerasi() {
    try {
      const { banned, pending } = await apiFetch(`/kelas/${kelasId}/moderasi`);
      const boxP = document.getElementById('list-minta-akses');
      if (boxP) boxP.innerHTML = pending.length
        ? pending.map((r) => `<div class="row mb"><b>${esc(r.nama)}</b><span class="nb-hint">${esc(r.email)}</span><span style="flex:1"></span>
            <button class="nb-btn nb-btn-sm nb-btn-green" data-akses-setuju="${r.id}">Setujui</button>
            <button class="nb-btn nb-btn-sm nb-btn-danger" data-akses-tolak="${r.id}">Tolak</button></div>`).join('')
        : `<div class="nb-hint">Tidak ada permintaan.</div>`;
      const boxB = document.getElementById('list-banned');
      if (boxB) boxB.innerHTML = banned.length
        ? banned.map((b) => `<div class="row mb"><b>${esc(b.nama)}</b><span class="nb-hint">${esc(b.alasan || 'tanpa alasan')}</span><span style="flex:1"></span>
            <button class="nb-btn nb-btn-sm" data-unban="${b.siswa_id}">Buka Blokir</button></div>`).join('')
        : `<div class="nb-hint">Tidak ada yang diblokir.</div>`;
    } catch (e) { toast(e.message, 'red'); }
  }

  if (isMentor) {
    try {
      const list = await apiFetch(`/kelas/${kelasId}/anggota`);
      document.getElementById('list-anggota').innerHTML = list.length
        ? list.map((a) => `<div class="row mb"><b>${esc(a.nama)}</b><span class="nb-hint">${esc(a.email)}</span><span style="flex:1"></span>
            <a class="nb-btn nb-btn-sm" href="kelas-detail.html?id=${kelasId}&view=siswa" title="Lihat sebagai siswa ini">👁 Pantau</a>
            <button class="nb-btn nb-btn-sm nb-btn-danger" data-ban="${a.id}" data-nama="${esc(a.nama)}">Kick/Ban</button></div>`).join('')
        : `<div class="nb-hint">Belum ada siswa. Bagikan kode kelas!</div>`;
    } catch (e) { toast(e.message, 'red'); }
    muatModerasi();

    document.getElementById('form-pengumuman').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await apiFetch(`/kelas/${kelasId}/pengumuman`, { method: 'POST', body: { isi: fp_isi.value } });
        toast('📢 Pengumuman terkirim ke semua anggota', 'green');
        e.target.reset();
      } catch (err) { toast(err.message, 'red'); }
    });
  }

  document.addEventListener('click', async (e) => {
    const q = (s) => e.target.closest(s);
    let b;
    if ((b = q('[data-ban]'))) {
      const alasan = prompt(`Kick/ban ${b.dataset.nama}? Tulis alasan (siswa bisa minta akses kembali):`, '');
      if (alasan === null) return;
      try { await apiFetch(`/kelas/${kelasId}/ban`, { method: 'POST', body: { siswa_id: b.dataset.ban, alasan } }); toast('Siswa dikeluarkan + diblokir', 'green'); muatModerasi(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-unban]')) && confirm('Buka blokir siswa ini?')) {
      try { await apiFetch(`/kelas/${kelasId}/ban/${b.dataset.unban}`, { method: 'DELETE' }); toast('Blokir dibuka', 'green'); muatModerasi(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-akses-setuju]'))) {
      try { await apiFetch(`/permintaan-akses/${b.dataset.aksesSetuju}`, { method: 'PUT', body: { keputusan: 'setuju' } }); toast('Akses disetujui ✓', 'green'); muatModerasi(); }
      catch (err) { toast(err.message, 'red'); }
    }
    if ((b = q('[data-akses-tolak]'))) {
      try { await apiFetch(`/permintaan-akses/${b.dataset.aksesTolak}`, { method: 'PUT', body: { keputusan: 'tolak' } }); toast('Permintaan ditolak', 'yellow'); muatModerasi(); }
      catch (err) { toast(err.message, 'red'); }
    }
  });

  muatMateri(); muatTugas(); muatKuis(); muatDiskusi();
  setInterval(() => { muatMateri(); muatDiskusi(); }, 10000); // polling lintas perangkat
  dengarRefresh(() => { muatMateri(); muatTugas(); muatKuis(); muatDiskusi(); }); // instan lintas-tab
})();
