# 07 - Desain UI/UX Neo-Brutalist + Responsive Layout

## 1. Prinsip Desain
- **Neo-Brutalist**: border tebal hitam, shadow keras tanpa blur (`4px 4px 0 #111`), warna blok berani, sudut sedikit membulat (8-12px).
- **Bersih & Konsisten**: satu set token warna/spasi dipakai di semua halaman. Tidak ada gaya tombol berbeda-beda.
- **Indikator visual jelas**: setiap elemen interaktif punya 3 state: `default → hover (geser + shadow membesar) → active/pressed (masuk ke dalam)` + `focus-visible` untuk keyboard + `disabled` yang jelas.
- **Mobile-first**: desain untuk HP dulu, lalu naik ke desktop.

## 2. Token Desain (`frontend/css/neo-brutal.css`)
```css
--bg: #FFF9EF;        /* krem kertas */
--surface: #FFFFFF;
--ink: #141414;       /* hitam utama border/teks */
--primary: #FFC900;   /* kuning */
--blue: #90E8FF;      /* biru muda */
--pink: #FF90E8;      /* pink */
--green: #23D46B;     /* hijau sukses */
--red: #FF5C5C;       /* merah danger */
--purple: #B388FF;
--border: 3px solid var(--ink);
--shadow: 5px 5px 0 var(--ink);
--shadow-sm: 3px 3px 0 var(--ink);
--shadow-lg: 8px 8px 0 var(--ink);
--radius: 12px;
Font: Archivo / Space Grotesk (heading, bold), Inter (body).
```

## 3. Komponen Standar
| Komponen | Kelas | Aturan |
|---|---|---|
| Button primer | `.nb-btn .nb-btn-primary` | bg kuning, border 3px, shadow 4px, hover `translate(-2px,-2px)` + shadow 6px, active `translate(2px,2px)` shadow 0 |
| Button sekunder/ghost | `.nb-btn-blue/.nb-btn-white/.nb-btn-dark` | sama, beda bg |
| Card | `.nb-card` | bg putih, border, shadow 5px, radius 12px, header card boleh berwarna |
| Input | `.nb-input` | border 3px, shadow 3px, focus: outline 3px + shadow membesar + bg kuning muda |
| Badge/Chip | `.nb-badge` | border 2px, shadow 2px, font kecil bold uppercase |
| Sidebar link | `.nb-navlink` | border transparan default, `.active` bg hitam teks putih / bg kuning, hover geser |
| Tabel | `.nb-table` | header bg hitam teks putih, row hover bg kuning muda, border 3px |
| Alert | `.nb-alert-*` | border + shadow + warna blok |
| Kode kelas | `.nb-code` | font mono, bg hitam, teks kuning, border + shadow, tombol copy |

Semua tombol **wajib**: `cursor:pointer`, min-height 44px (mudah disentuh), indikator `focus-visible: 3px dashed`.

## 4. Layout Responsif

### Desktop ≥1024px: multi-kolom + sidebar tetap
```
+--------+----------------------------------+
| SIDEBAR| TOPBAR (hamburger hidden)        |
| 260px  +----------------------------------+
| tetap  | MAIN: grid 12 kolom              |
|        | [konten 8] [aside 4] / 3 kartu   |
+--------+----------------------------------+
```
- `.app { display:grid; grid-template-columns: 260px 1fr; }`
- Sidebar `position:sticky; height:100vh`.
- Konten multi-kolom: `grid-template-columns: repeat(3,1fr)` untuk kartu kelas/statistik.

### Tablet 768–1023px: sidebar jadi drawer overlay
- Sidebar `position:fixed; transform:translateX(-100%)`, muncul saat `.app.drawer-open`.
- Overlay gelap di belakang.
- Grid konten 2 kolom.

### Mobile <768px: single kolom + hamburger
- Topbar tampilkan tombol hamburger (☰).
- Semua grid jadi 1 kolom, kartu full-width.
- Sidebar drawer full-height 280px, tutup via tombol ✕ / klik overlay / tekan Escape.
- Bottom padding ekstra agar tidak tertutup.

Breakpoint di CSS:
```css
@media (max-width:1023px) { /* drawer mode */ }
@media (max-width:767px) { /* single column */ }
```

## 5. Interaksi Drawer (`frontend/js/layout.js`)
- `toggleDrawer()`, `openDrawer()`, `closeDrawer()`.
- Simpan preferensi desktop: selalu terbuka; mobile: selalu tertutup default.
- Aksesibilitas: `aria-expanded`, `aria-controls`, fokus kembali ke hamburger saat ditutup, tutup dengan `Esc`.
- Nav aktif: cocokkan `data-nav` dengan nama halaman → tambah `.active`.

## 6. Navigasi
- Mentor: Dashboard, Kelas Saya, Buat Kelas, Tugas Masuk, Kuis, Diskusi.
- Siswa: Dashboard, Kelas Saya, Gabung Kelas (input kode), Tugas, Kuis, Diskusi.
- Sidebar bawah: profil + logout. Topbar: hamburger (mobile), judul halaman, badge role, avatar.

## 7. Aksesibilitas & UX
- Kontras teks ≥ 4.5:1 (teks hitam di atas kuning/biru/pink lolos).
- Jangan hanya andalkan warna: status selalu ada ikon + teks (mis. ● Belum dinilai, ✓ Dinilai).
- Toast/Alert muncul di kanan atas dengan border+shadow, auto-hilang 4 detik.
- Empty state dengan ilustrasi kotak + CTA jelas (mis. "Belum ada kelas → Gabung dengan kode").
- Validasi form inline: input error border merah + pesan + `aria-invalid`.

## 8. File Terkait
- `frontend/css/neo-brutal.css` — token + komponen + layout.
- `frontend/js/layout.js` — drawer + nav aktif.
- `frontend/pages/design-system.html` — showcase untuk laporan/foto.
- `dashboard-mentor.html`, `dashboard-siswa.html`, `kelas-detail.html` — contoh penerapan.
