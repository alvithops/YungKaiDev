// Kemiripan teks untuk penilaian otomatis esai (tanpa dependensi).
// Aturan: jawaban benar bila mencakup ≥ AMBANG (60%) kata kunci (case-insensitive,
// stopword dibuang, pencocokan substring untuk kata > 3 huruf sebagai toleransi
// typo/imbuhan sederhana).
const STOP = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'adalah', 'ialah', 'itu', 'ini', 'dengan',
  'untuk', 'pada', 'sebagai', 'atau', 'juga', 'sudah', 'telah', 'akan', 'bisa',
  'dapat', 'harus', 'sangat', 'lebih', 'kurang', 'dalam', 'karena', 'oleh',
  'saat', 'ketika', 'jika', 'agar', 'serta', 'tetapi', 'namun', 'bahwa',
  'kami', 'kita', 'mereka', 'dia', 'ia', 'nya', 'saya', 'anda', 'kamu',
  'apa', 'siapa', 'bagaimana', 'berapa', 'tersebut', 'the', 'of', 'a', 'an',
]);
const AMBANG = 0.6;

function token(teks) {
  return String(teks || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && w.length > 1 && !STOP.has(w));
}

function mirip(a, b) {
  if (a === b) return true;
  if (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

// 0..1 — proporsi kata kunci yang tercakup jawaban
function kemiripan(jawaban, kunci) {
  const K = [...new Set(token(kunci))];
  if (!K.length) return 0;
  const J = token(jawaban);
  if (!J.length) return 0;
  const cocok = K.filter((k) => J.some((j) => mirip(j, k))).length;
  return cocok / K.length;
}

function esaiBenar(jawaban, kunci) {
  if (!String(kunci || '').trim() || !String(jawaban || '').trim()) return { benar: false, skor: 0 };
  const skor = kemiripan(jawaban, kunci);
  return { benar: skor >= AMBANG, skor: Math.round(skor * 100) / 100 };
}

module.exports = { kemiripan, esaiBenar, AMBANG };
