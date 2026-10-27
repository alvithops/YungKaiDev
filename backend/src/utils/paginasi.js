// Pagination + pencarian list: ?q=&limit=(1-100, default 50)&offset=(default 0).
// Respons tetap array (kompatibel frontend lama); total di header X-Total-Count.
function pagine(req) {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const q = String(req.query.q || '').trim().slice(0, 50);
  return { limit, offset, q };
}
module.exports = { pagine };
