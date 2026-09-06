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
