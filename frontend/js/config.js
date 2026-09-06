// Base URL API: otomatis ikut origin saat diserve backend (:3000),
// atau ke localhost:3000 saat dibuka via Live Server / file://.
const API_BASE_URL = (() => {
  try {
    if (location.protocol.startsWith('http') && location.port === '3000') return '/api';
    if (location.protocol.startsWith('http')) return `${location.protocol}//${location.hostname}:3000/api`;
  } catch {}
  return 'http://localhost:3000/api';
})();
// Base URL file upload (pakai origin yang sama dengan API)
const FILE_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
