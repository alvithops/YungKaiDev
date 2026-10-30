# event_management

A Flutter project for event management managed via VS Code.

## 📝 Deskripsi

Aplikasi manajemen event yang dibangun dengan **Flutter** dan **Dart**, mendukung operasi **CRUD** (Create, Read, Update, Delete) serta penyimpanan data lokal menggunakan `SharedPreferences`.

## ✨ fitur

| fitur | keterangan |
|-------|------------|
| **Menambah Event** | Form dengan validasi field, picker tanggal, dan simulpan ke local storage |
| **Melihat Event** | Daftar event dengan tampilan Card/ListTile |
| **Mengedit Event** | Dialog edit dengan field pre-filled dan penyimpanan perubahan |
| **Menghapus Event** | Hapus event melalui PopupMenu atau tombol konfirmasi |
| **Persisten Data** | Data event disimpan di `SharedPreferences`, tidak hilang saat aplikasi ditutup |
| **Navigasi** | 3 route utama: `/` (home), `/add-event`, `/event-list` |
| **Search** | Mencari event berdasarkan title, location, atau description |

## 🚀 Cara Menjalankan

Ikuti langkah-langkah berikut di terminal VS Code:

### **1. Buka Terminal**
```bash
cd /home/payung/WebEvent
```

### **2. Install Dependencies**
```bash
flutter pub get
```
*Menunggu hingga selesai (akan menginstall `shared_preferences` dan library lainnya).*

### **3. Jalankan Aplikasi**
```bash
# Opsi A: Jalankan di Chrome browser
flutter run -d chrome

# Opsi B: Jalankan di device/emulator
flutter run

# Opsi C: Dari VS Code
# - Klik tombol ▶ (Run) di panel kiri
# - Atau tekan F5 di keyboard
```

### **4. Akses Aplikasi**
- Akan terbuka di browser Chrome atau emulator/device
- Halaman utama menampilkan daftar event atau pesan "No events yet"

## 📁 Struktur Project

```
/home/payung/WebEvent/
├── pubspec.yaml          # Dependencies (termasuk shared_preferences)
├── lib/
│   ├── main.dart         # Entry point aplikasi
│   ├── models/
│   │   └── event.dart    # Model Event dengan toMap/fromMap
│   ├── services/
│   │   └── event_service.dart  # CRUD + Persistensi ke SharedPreferences
│   ├── screens/
│   │   ├── home_screen.dart      # Dashboard dengan CRUD operations
│   │   ├── add_event_screen.dart # Form add event beserta date picker
│   │   └── event_list_screen.dart # List event dengan delete/edit via PopupMenu
│   └── widgets/
│       └── event_card.dart       # Reusable Card widget untuk menampilkan event
├── web/                  # Output build web (otomatis Flutter generate)
├── android/ / ios/ / linux/ # Modul platform default Flutter
```

## 📱 Alur Penggunaan

### **1. Halaman Utama (Home Screen)**
- Menampilkan daftar event yang sudah disimpan
- Jika belum ada event, menampilkan teks "No events yet"
- Tombol **FAB (+)** di kanan bawah untuk menambah event baru

### **2. Menambah Event (Add Event Screen)**
- Form fields: Title (*wajib*), Description, Location, Date
- Pilih tanggal via **Date Picker**
- Tekan **Add Event** untuk menyimpan
- Akan kembali ke halaman utama dengan daftar event terbaru

### **3. Melihat Daftar Event (Event List Screen)**
- Menampilkan semua event dalam format ListTile
- Setiap event memiliki **PopupMenu** dengan opsi:
  - **Edit** → Navigasi ke form add dengan data event yang sudah ada
  - **Hapus** → Menghapus event dengan konfirmasi

### **4. Mengedit Event**
- Dari Event List: Pilih opsi **Edit** di PopupMenu
- Dialog akan muncul dengan field terisi data lama
- Sesuaikan field dan tekan **Simpan Perubahan**
- Akan kembali ke daftar event dengan data terupdate

### **5. Menghapus Event**
- Dari Event List: Pilih opsi **Hapus** di PopupMenu
- Dari Home Screen: Tap tombol Hapus di EventCard
- Event akan dihapus permanen dari database local
- Daftar event akan otomatis terupdate tanpa event yang terhapus

### **6. Persistensi Data**
- Setiap kali event ditambah/hapus/diedit, data otomatis disimpan ke `SharedPreferences`
- Data akan tetap ada setelah aplikasi ditutup dan dibuka kembali

## 📦 Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.6
  shared_preferences: ^2.2.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

## 🛠️ Troubleshooting

- **`flutter not found`**: Pastikan Flutter terinstall, jalankan `sudo snap install flutter --classic`
- **`No connected devices`**: Colokkan device via USB atau jalankan `flutter run -d chrome`
- **Error analisis**: Jalankan `flutter clean` lalu `flutter pub get`

## 👤 Developer

Dibuat oleh **payung** untuk memenuhi kebutuhan manajemen event menggunakan Flutter/Dart di VS Code.

---

**🎉 Selamat mengeksplorasi aplikasi Event Management Anda!**