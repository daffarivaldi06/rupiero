# Build release Rupiero untuk HP

Panduan memasang Rupiero sebagai app harian (tanpa Metro, tanpa data contoh) dan memperbaruinya nanti **tanpa kehilangan data**.

## Yang perlu diketahui dulu

- **Data hanya ada di HP**, di database app. Data hilang jika app di-uninstall atau "Hapus data" di Pengaturan Android.
  Jadi sebelum langkah berisiko apa pun: Pengaturan → Data → **Ekspor backup (JSON)**, simpan di Drive/Files.
- **Kunci tanda tangan** ada di `C:\Users\daffa\.rupiero\rupiero-release.jks`. Password-nya ada di `BACA-SAYA.txt` di folder yang sama
  dan di `C:\Users\daffa\.gradle\gradle.properties`. Android hanya mau memasang update di atas app yang ditandatangani kunci yang **sama**.
  Simpan salinan file `.jks` dan password-nya di luar laptop (password manager + cloud pribadi).
  Kalau kunci hilang, update baru hanya bisa dipasang setelah uninstall (data hilang, kecuali dipulihkan dari backup).
- Build release **tidak** punya data contoh dan **tidak** menampilkan Alat Pengembang (reset database).

## Membuat APK release

Dari folder proyek, di Git Bash:

```bash
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Hasilnya: `android/app/build/outputs/apk/release/app-release.apk` (±35 MB). `arm64-v8a` cukup untuk HP Android modern;
tambahkan `,x86_64` jika juga ingin memasangnya di emulator.

Cek APK ditandatangani kunci Rupiero (SHA-256 harus `5B:1C:BF:A1:…:15:55:53`):

```bash
"$LOCALAPPDATA/Android/Sdk/build-tools/"*/apksigner.bat verify --print-certs app/build/outputs/apk/release/app-release.apk
```

## Pemasangan pertama

Build debug yang sekarang ada di HP ditandatangani kunci debug, jadi release **tidak bisa** dipasang di atasnya.
Debug harus di-uninstall dulu, dan ini **menghapus data di HP** (saat ini data uji).

1. Jika ada data di HP yang ingin dibawa: Pengaturan → Data → Ekspor backup (JSON).
2. Uninstall Rupiero dari HP (tahan ikon → Uninstall), atau `adb uninstall com.daffarivaldi.budgetapp`.
3. Pasang release:
   - Lewat kabel: `adb install android/app/build/outputs/apk/release/app-release.apk`, atau
   - Tanpa kabel: kirim APK ke HP (Drive, Quick Share), buka file, izinkan "Instal app tidak dikenal" untuk app tersebut.
4. Buka Rupiero. Database baru dibuat kosong dengan dua akun default. Jika perlu, Pengaturan → Data → Pulihkan dari backup.
5. Pasang ulang widget (widget lama ikut terhapus saat uninstall).

## Memperbarui ke versi baru (data tetap)

1. **Backup dulu**: Pengaturan → Data → Ekspor backup (JSON). Ini jaring pengaman, bukan karena update menghapus data.
2. Naikkan versi di `app.json`: `"version"` (mis. `1.1.0`) dan **`android.versionCode` +1** (mis. `1` → `2`).
   Android menolak versionCode yang lebih kecil dari yang terpasang.
3. Buat APK release seperti di atas (kunci yang sama dipakai otomatis dari `gradle.properties`).
4. Pasang **di atas** versi lama, jangan uninstall:
   - `adb install -r android/app/build/outputs/apk/release/app-release.apk`, atau
   - buka APK di HP → Android menampilkan **"Update"** (bukan "Install"). Jika muncul pesan konflik paket/tanda tangan, **berhenti**:
     artinya kuncinya berbeda. Jangan uninstall; cek kunci dulu.
5. Buka app. Jika versi baru membawa perubahan skema, migrasi database berjalan otomatis sekali saat dibuka (`PRAGMA user_version`),
   tanpa menghapus data.

## Jangan pernah

- Uninstall app atau "Hapus data" tanpa backup terbaru.
- Mengganti `android.package` (`com.daffarivaldi.budgetapp`) di `app.json`: Android menganggapnya app lain, data tidak ikut.
- Membuat kunci baru atau menghapus `rupiero-release.jks`.
- Memasang build debug di atas release (kunci berbeda, akan ditolak).
