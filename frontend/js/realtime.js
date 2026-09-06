// Realtime lintas-tab (dari referensi): BroadcastChannel + fallback event storage.
// Setiap tab yang melakukan perubahan (POST/PUT/DELETE via api.js) menyiarkan
// sinyal; tab lain yang terbuka otomatis me-refresh daftar (tanpa reload halaman).
// Catatan: ini untuk tab di browser yang SAMA. Lintas perangkat tetap via polling API.
const siarkanPerubahan = (() => {
  let ch = null;
  try { if ('BroadcastChannel' in window) ch = new BroadcastChannel('pkl-web-v1'); } catch {}
  return function siarkan(jenis = 'refresh') {
    try { ch?.postMessage({ jenis, at: Date.now() }); } catch {}
    try { localStorage.setItem('pkl-web-ping', JSON.stringify({ jenis, at: Date.now() })); } catch {}
  };
})();
window.__siarkan = siarkanPerubahan;

window.addEventListener('storage', (e) => {
  if (e.key === 'pkl-web-ping') window.dispatchEvent(new CustomEvent('pkl:refresh'));
});
try {
  const ch2 = 'BroadcastChannel' in window ? new BroadcastChannel('pkl-web-v1') : null;
  if (ch2) ch2.onmessage = () => window.dispatchEvent(new CustomEvent('pkl:refresh'));
} catch {}

// Debounce bawaan agar refresh beruntun tidak spam API.
function dengarRefresh(fn, jeda = 400) {
  let t = null;
  window.addEventListener('pkl:refresh', () => {
    clearTimeout(t);
    t = setTimeout(fn, jeda);
  });
}
