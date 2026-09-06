# 08 - Adopsi Referensi: localStorage + BroadcastChannel

Referensi yang diberikan memakai arsitektur **murni klien**: seluruh DB di
`localStorage` (`pkl_db_v1`) + sinkronisasi lintas-tab via `BroadcastChannel`.
Analisis kejujuran + apa yang diadopsi:

## Perbandingan jujur

| Aspek | Murni localStorage (referensi) | Backend SQLite (program ini) |
|---|---|---|
| Lintas perangkat (HP mentor → laptop siswa) | ❌ Tidak bisa (data terkunci di 1 browser) | ✅ Bisa, semua baca server yang sama |
| Multi-user bersamaan | ❌ Tabrakan / tidak konsisten | ✅ Transaksi DB + JWT |
| File tugas besar (zip/video) | ❌ Base64 membengkak ±33%, quota ±5MB | ✅ File fisik di `uploads/` |
| Jalan tanpa install | ✅ Buka file langsung | ⚠ Perlu `npm start` sekali |
| Realtime lintas-tab | ✅ ±60ms via BroadcastChannel | ✅ Diadopsi (lihat bawah) |
| Cocok untuk | Demo 1 laptop / prototipe | Dipakai kelas beneran |

**Keputusan:** backend tetap sumber kebenaran (agar mentor & siswa di perangkat
berbeda bisa kolaborasi — syarat utama E-learning). Teknik referensi diadopsi
pada lapisan yang tepat:

## Yang diadopsi

1. **Realtime lintas-tab** (`frontend/js/realtime.js`)
   - `BroadcastChannel('pkl-web-v1')` + fallback event `storage` (`pkl-web-ping`).
   - `api.js` otomatis menyiarkan sinyal setiap mutasi (POST/PUT/DELETE).
   - Halaman mendengar event `pkl:refresh` (debounce 400ms) lalu me-refresh
     daftar — efeknya sama seperti referensi (±60ms–400ms, tanpa reload).
   - Polling 10 detik tetap ada untuk **lintas perangkat**.

2. **localStorage sebagai cache offline** (`api.js`)
   - Setiap respons GET disimpan (`pklcache:<path>`).
   - Saat fetch gagal (server mati / offline), data terakhir ditampilkan +
     toast "📴 Offline". Sesuai semangat referensi, tapi tanpa risiko
     divergensi data.

3. **Notifikasi otomatis** (ganti `notifyClass`)
   - Tabel `notifikasi`; mentor tambah materi/tugas/kuis/pengumuman atau
     menilai → baris notifikasi untuk semua anggota (`utils/notifikasi.js`).
   - Lonceng 🔔 + angka belum-baca di topbar, polling + refresh lintas-tab.

4. **Ban/kick + permintaan akses** (ganti `DB.banned` + `accessRequests`)
   - Tabel `banned` + `access_requests`. Join saat dibanned → otomatis buat
     permintaan pending. Mentor setujui (unban + masuk kembali) / tolak.

5. **Transkrip nilai** (`pages/transkrip.html`)
   - Rata-rata tugas/kuis/total + unduh `.txt` (seperti referensi).

6. **Mode pantau mentor** (`kelas-detail.html?id=X&view=siswa`)
   - Melihat tampilan persis siswa (read-only) + tombol 👁 di daftar anggota.
