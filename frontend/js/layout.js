// Drawer + nav aktif — dipakai semua halaman app (mentor/siswa).
(function () {
  const app = document.getElementById('app');
  const btn = document.getElementById('btnHamburger');
  const scrim = document.getElementById('scrim');
  const btnClose = document.getElementById('btnCloseDrawer');

  function openDrawer() {
    if (!app) return;
    app.classList.add('drawer-open');
    btn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if (!app) return;
    app.classList.remove('drawer-open');
    btn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    btn?.focus?.();
  }
  function toggleDrawer() {
    app.classList.contains('drawer-open') ? closeDrawer() : openDrawer();
  }

  btn?.addEventListener('click', toggleDrawer);
  btnClose?.addEventListener('click', closeDrawer);
  scrim?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // Tandai nav aktif berdasar atribut body data-page
  const page = document.body?.dataset?.page;
  if (page) {
    document.querySelectorAll('.nb-navlink').forEach((a) => {
      if (a.dataset.nav === page) a.classList.add('active');
    });
  }

  // Tutup drawer otomatis setelah klik link (mode tablet/mobile)
  document.querySelectorAll('.nb-navlink').forEach((a) => {
    a.addEventListener('click', () => {
      if (window.innerWidth < 1024) closeDrawer();
    });
  });
})();

// Kehadiran live lintas-tab (pelengkap last_seen server untuk lintas perangkat).
// Tiap halaman app menyiarkan "saya online" tiap 15 dtk; peta window.__hadirMap
// dipakai mentor untuk dot hijau real-time. Tanpa login = tidak disiarkan.
(function () {
  let ch = null;
  try { if ('BroadcastChannel' in window) ch = new BroadcastChannel('pkl-hadir-v1'); } catch {}
  window.__hadirMap = window.__hadirMap || {};
  function kirimHadir() {
    try {
      const u = JSON.parse(localStorage.getItem('elearning_user') || 'null');
      if (!u || !localStorage.getItem('elearning_token') || !ch) return;
      ch.postMessage({ id: u.id, nama: u.nama, role: u.role, at: Date.now() });
    } catch {}
  }
  kirimHadir();
  setInterval(kirimHadir, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kirimHadir(); });
  if (ch) ch.onmessage = (e) => {
    const d = e.data || {};
    if (!d.id) return;
    window.__hadirMap[d.id] = { nama: d.nama, role: d.role, at: d.at };
    window.dispatchEvent(new CustomEvent('pkl:hadir', { detail: d }));
  };
  setInterval(() => {
    const now = Date.now();
    for (const k of Object.keys(window.__hadirMap)) {
      if (now - window.__hadirMap[k].at > 45000) delete window.__hadirMap[k];
    }
    window.dispatchEvent(new CustomEvent('pkl:hadir'));
  }, 15000);
})();
