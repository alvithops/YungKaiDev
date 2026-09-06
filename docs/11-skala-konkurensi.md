# 11 - Skala: Mentor + 1000 Siswa Bersamaan

## Hasil uji nyata (laptop dev, 6 Sep 2026)

| Skenario | Hasil |
|---|---|
| 200 user campuran × 3 putaran (3660 req) | 100% sukses, 845–882 req/detik |
| **1000 user × 1 putaran (6100 req, gelombang 100)** | **100% sukses, 1090 req/detik, p95 88ms** |
| Burst 1000× serentak persis (`/api/health`) | 100% sukses dalam 0,9 dtk (1152 req/detik) |
| Mode cluster 4 worker (300 user × 2) | 100% sukses, 1194 req/detik |

Cara mengulang: `node loadtest.js --users 1000 --putaran 1 --gelombang 100`
Burst: `node loadtest.js --burst 1000`

## Kenapa bisa bersamaan

1. **JWT stateless** — tiap request membawa token sendiri; tidak ada sesi
   server yang berebut. Mentor + 1000 siswa = 1001 token independen.
2. **SQLite WAL + `busy_timeout=5000`** — pembaca tidak saling blokir;
   penulis antre otomatis (aman, tanpa error `database is locked`).
3. **Polling ringan + cache** — frontend refresh 10 detik + cache
   localStorage saat offline; beban baca terdistribusi.
4. **Mode cluster** — `CLUSTER=1 npm start` (atau `npm run cluster`)
   menjalankan 1 worker per core CPU; worker mati otomatis di-restart.

## Batas & jalan keluar

| Batas | Dampak | Solusi |
|---|---|---|
| Tulis SQLite serial (1 penulis sekali jalan) | Upload massal persis bersamaan sedikit antre (ms) | Sudah ditutup `busy_timeout`; untuk >5000 user pindah MySQL via `database/schema.sql` |
| Rate-limit login in-memory per proses | Di mode cluster, batas 5x berlaku per worker | Longgarkan / pindahkan ke Redis bila perlu |
| 1 server fisik | Kapasitas ±1000 req/detik | Taruh Nginx di depan + `npm run cluster` |

## Akses bersamaan 1 sekolah (LAN)

```bash
# di laptop server:
npm start            # atau: npm run cluster
hostname -I          # catat IP, mis. 192.168.1.10
# di HP/laptop lain (1 WiFi): buka http://192.168.1.10:3000
```

Tidak perlu instal apa pun di perangkat siswa — cukup browser.
