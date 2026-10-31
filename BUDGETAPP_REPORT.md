# BudgetApp — Laporan Analisis Codebase

> Dibuat 2026-10-31 dari pembacaan seluruh source (`App.tsx`, `index.ts`, `app.json`, `package.json`, `src/**`).
> Total kode aplikasi ±1.600 baris TypeScript. Tidak ada file yang diubah selain laporan ini.

---

## 1. Ringkasan

**Tujuan:** aplikasi pencatat keuangan pribadi (offline, Android-first) untuk mencatat pemasukan/pengeluaran
per kategori dalam dua mata uang (IDR & EUR), dengan widget Android untuk melihat saldo.

**Fitur yang sudah ada**
- Dashboard bulanan: saldo "Sisa Uang", total income/expense, navigasi bulan `<` `>` — `src/screens/DashboardScreen.tsx`
- CRUD kategori (tambah, rename, hapus beserta semua transaksinya) — `CategoryFormScreen.tsx`, `CategoryDetailScreen.tsx`
- Tambah transaksi: tipe, mata uang (IDR/EUR), nominal, kategori, catatan, flag "recurring monthly" — `TransactionFormScreen.tsx`
- Detail kategori: ringkasan bulan berjalan + daftar transaksi — `CategoryDetailScreen.tsx`
- Pengaturan: mata uang tampilan, kurs manual EUR→IDR, reset semua transaksi — `SettingsScreen.tsx`
- Widget Android "Budget Summary" — `src/widget/Widget.tsx`, `src/widget/widget-task-handler.tsx`

**Alur pengguna**
1. Buka app → Dashboard (bulan sekarang) → grid kartu kategori + tombol "Add Category".
2. Tap kategori → Category Detail → `+ Income` / `- Expense` → modal Transaction Form (kategori & tipe terkunci) → simpan → kembali.
3. Header kanan "Settings" → ganti display currency / kurs / reset data.
4. Catatan: **tidak ada entry point** ke Transaction Form tanpa kategori (route `TransactionForm` tanpa param tidak pernah dipanggil),
   jadi mode "pilih/ketik kategori bebas" di form praktis tak terjangkau.

---

## 2. Tech stack & arsitektur

| Aspek | Detail |
|---|---|
| Framework | Expo SDK 54, React Native 0.81.5, React 19.1, New Architecture aktif (`app.json:7`) |
| Bahasa | TypeScript 5.9, `strict: true` (`tsconfig.json`) |
| Navigasi | `@react-navigation/native` 7 + `native-stack` — satu stack di `App.tsx:32-72` |
| Database | `expo-sqlite` 16 (`SQLiteProvider` + `useSQLiteContext`), file `budget.db` |
| Widget | `react-native-android-widget` 0.20 (config plugin di `app.json:32-46`, handler di `index.ts:7`) |
| Chart | `react-native-gifted-charts` (diimport tapi **tidak dirender**) |
| Tidak dipakai | `expo-file-system`, `expo-sharing`, `expo-linear-gradient` (terinstal, 0 import) |
| State management | Hanya `useState` lokal per screen; data di-reload dari SQLite via `useFocusEffect`. Tidak ada store global/cache. |
| API / backend | Tidak ada. 100% lokal/offline. |

**Struktur folder**
```
App.tsx                  # navigator + SQLiteProvider + RootStackParamList
index.ts                 # registerRootComponent + registerWidgetTaskHandler
src/components/          # Button, Card, Input (UI primitif)
src/db/database.ts       # skema, migrasi, seed, semua query (satu file "repository")
src/screens/             # 5 screen
src/theme/colors.ts      # palet warna (dark)
src/widget/              # UI widget + task handler (headless)
android/                 # hasil prebuild (di-.gitignore)
```

**Build & run**
- `npm install` lalu `npx expo run:android` (wajib *development build*: modul widget native tidak jalan di Expo Go).
- `npm start` = Metro dev server untuk dev build yang sudah terpasang.
- `npm run ios`: bisa build, tapi widget Android-only.
- `npm run web`: kemungkinan besar gagal, karena `react-dom`/`react-native-web` tidak ada di `package.json`, dan expo-sqlite web butuh setup tambahan.
- Tidak ada `eas.json`, lint, formatter, atau CI. Package id masih `com.anonymous.BudgetApp` (`app.json:24`).

---

## 3. Model data

Skema di `src/db/database.ts:27-47`:

```
transactions(id PK, amount REAL, type TEXT, category TEXT, note TEXT,
             date TEXT ISO-UTC, currency TEXT DEFAULT 'IDR', is_recurring INTEGER 0/1)
categories  (id PK, name TEXT UNIQUE)
settings    (id=1 CHECK, displayCurrency TEXT, eurToIdrRate REAL DEFAULT 17000)
```

**Relasi**
- `transactions.category` → `categories.name` lewat **string nama**, tanpa foreign key. Rename dan delete
  disinkronkan manual (`updateCategory` :92, `deleteCategory` :99).
- Transaksi bisa punya kategori yang tidak ada di tabel `categories` (input bebas di `TransactionFormScreen.tsx:129-133`).
  Transaksi seperti ini masuk total Dashboard, tapi tidak punya kartu, sehingga tidak bisa dilihat atau dihapus.
- `settings` singleton: satu kurs global untuk semua transaksi, termasuk yang historis.
- **Tidak ada entitas Budget** (limit/anggaran), meski nama app "BudgetApp". Tidak ada Account/Wallet dan tidak ada RecurringRule.
- Interface TS: `Transaction`, `Category`, `AppSettings` (`database.ts:3-23`). Penamaan kolom campur:
  `is_recurring` (snake) vs `displayCurrency` (camel), di-mapping manual di `getTransactions` :145-148.

---

## 4. Layar & komponen

| Screen | File | Isi |
|---|---|---|
| Dashboard | `src/screens/DashboardScreen.tsx` | Pemilih bulan, kartu saldo, grid kategori (lebar dihitung dari `Dimensions` statis :14-15) |
| CategoryDetail | `src/screens/CategoryDetailScreen.tsx` | Edit/Delete kategori, ringkasan **bulan berjalan saja** (:24-25), list transaksi via `.map` |
| CategoryForm (modal) | `src/screens/CategoryFormScreen.tsx` | Satu input nama; mode add/edit |
| TransactionForm (modal) | `src/screens/TransactionFormScreen.tsx` | Tipe, currency, amount, kategori, note, switch recurring |
| Settings | `src/screens/SettingsScreen.tsx` | Display currency, kurs, danger zone |

**Komponen:** `Button` (3 varian, `loading`), `Card`, `Input` (label, `error`, mode `isCurrency` yang memformat ribuan).
Widget: `BudgetWidget` (FlexWidget/TextWidget) dan `widgetTaskHandler` yang membuka koneksi SQLite sendiri.

---

## 5. Kualitas kode

**Yang rapi**
- Akses DB terpusat di satu modul. Query memakai parameter binding (aman dari SQL injection).
- Operasi multi-statement memakai `withTransactionAsync` (`database.ts:93,100`).
- `RootStackParamList` sudah didefinisikan (`App.tsx:17-23`). Palet warna terpusat di `src/theme/colors.ts`.
- Komponen UI kecil dan konsisten. Konfirmasi `Alert` sebelum aksi destruktif.

**Yang berantakan / duplikasi**
- Simbol mata uang (`=== 'EUR' ? '€' : 'Rp'`) diulang di Dashboard :57, CategoryDetail :73/:141, TransactionForm :97, dan Widget (hardcode "Rp").
- Kartu saldo (balance + income/expense) diduplikasi di Dashboard :81-94 dan CategoryDetail :101-119.
- Pola `loadData`/`onRefresh`/`useFocusEffect` disalin di dua screen. Pasangan tombol IDR/EUR ada di Settings dan TransactionForm.
- Format bulan: Dashboard pakai `toISOString().slice(0,7)` (UTC, :23), CategoryDetail pakai `getMonth()` (lokal, :25).
- Typing longgar: `useRoute<any>()` di 3 screen, `useNavigation<any>()` (`CategoryFormScreen.tsx:13`), `getAllAsync<any>` dan `params: any[]` (`database.ts:129,144`).
- Widget menghardcode warna (`Widget.tsx:17,26,43,48`) alih-alih memakai `colors`.
- Import tak terpakai: `useEffect` dan `PieChart` (Dashboard), `useEffect` (CategoryForm), `navigation` (Settings :14).

**Bug & risiko yang terlihat**
1. **EUR tidak bisa desimal.** `Input` dengan `isCurrency` membuang semua non-digit (`Input.tsx:19`), sehingga "12.50" tersimpan sebagai 1250 €. Hal yang sama berlaku untuk input kurs di Settings (:114).
2. **Navigasi menumpuk screen** (React Navigation 7: `navigate` tidak lagi kembali ke route yang sudah ada di stack; sudah dicek di `StackRouter`):
   - Setelah rename, `navigate('CategoryDetail')` (`CategoryFormScreen.tsx:32`) mendorong detail baru di atas modal. Tombol back kembali ke form edit dan ke detail lama yang namanya sudah usang.
   - Setelah hapus, `navigate('Dashboard')` (`CategoryDetailScreen.tsx:62`) mendorong Dashboard kedua. Tombol back membuka detail kategori yang sudah terhapus.
   - Perbaikan: `goBack()` / `popTo()` / `navigation.setParams`.
3. **Recurring semu & tak bisa dihentikan.** Transaksi recurring dihitung ulang di setiap bulan ≥ bulan dibuat, tanpa batas (`database.ts:132,135`). Tidak ada edit atau hapus transaksi, jadi recurring tidak bisa dimatikan. Query tanpa filter bulan (widget) hanya menghitungnya sekali, sehingga total widget ≠ total Dashboard.
4. **Zona waktu.** `date` disimpan UTC (`TransactionFormScreen.tsx:51`) dan di-group dengan `strftime` UTC. Transaksi tanggal 1 jam 00:00–07:00 WIB masuk bulan sebelumnya. Bulan default Dashboard juga UTC.
5. **Widget salah dan basi:** selalu "Rp" walau display EUR (`Widget.tsx:29,43,48`), menampilkan saldo *all-time* (bukan bulanan), dan tidak pernah di-refresh setelah transaksi (`requestWidgetUpdate` tidak dipanggil).
6. **Konversi pakai kurs saat ini** untuk semua histori (`database.ts:169-173`). Mengubah kurs ikut mengubah saldo bulan-bulan lalu.
7. Hapus kategori ikut menghapus semua transaksinya tanpa opsi pindah kategori (`database.ts:102`).
8. Migrasi `ALTER TABLE` dibungkus `try/catch {}` kosong (`database.ts:50-56`), tanpa versi skema. Error lain ikut tertelan.
9. `SQLiteProvider` tanpa penanganan error: jika `initDb` gagal, app crash tanpa pesan.
10. `getBalance` mengambil semua baris lalu menjumlah di JS. CategoryDetail menjalankan query transaksi dua kali (:29-31).

**Test:** tidak ada sama sekali (tidak ada jest/jest-expo, tidak ada file `*.test.*`), dan tidak ada ESLint/Prettier.

---

## 6. UX (terlihat dari kode)

- **Validasi:** hanya via `Alert`. Prop `error` di `Input` tidak pernah dipakai. Nominal `0` diterima (`TransactionFormScreen.tsx:36`). Tidak ada batas panjang nama/catatan. Nama kategori unik secara case-sensitive.
- **Error handling:** kegagalan load hanya `console.error` (Dashboard :33, CategoryDetail :34), dan user melihat data kosong. `loadSettings` tanpa try/catch.
- **Input angka:** separator ribuan di input memakai koma (`Input.tsx:13`), sedangkan tampilan memakai titik (`id-ID`). Ini membingungkan untuk user Indonesia. Hasil konversi tampil dengan sampai 3 desimal (mis. "€ 1,176").
- **Transaksi:** tanggal tidak bisa dipilih (selalu "sekarang"). Transaksi tidak bisa diedit atau dihapus. Tidak ada daftar semua transaksi atau pencarian.
- **Feedback berlebihan:** setiap ganti currency memunculkan Alert "Success" (`SettingsScreen.tsx:33`).
- **Tipe terkunci tapi tombol tetap tampak bisa ditekan** (hanya opacity 0.3, `TransactionFormScreen.tsx:69-76`).
- **Keyboard:** tidak ada `KeyboardAvoidingView` dan tidak ada `keyboardShouldPersistTaps`, sehingga tap chip kategori saat keyboard terbuka butuh dua kali tap.
- **Aksesibilitas:** tidak ada `accessibilityLabel`/`accessibilityRole` di semua `Pressable`. Tombol bulan hanya teks `<` `>` dengan target sentuh kecil (`DashboardScreen.tsx:141`). Tinggi tetap (50/52px) bisa memotong teks pada font scaling besar. Teks putih di atas `#FF3D00` kontrasnya sekitar 3.6:1 (< 4.5).
- **Mobile/theme:** app gelap tapi `userInterfaceStyle: "light"` dan splash putih (`app.json:8,11`). Lebar grid dari `Dimensions` statis, tidak responsif untuk tablet/rotasi (`supportsTablet: true`).
- **Bahasa campur:** "Sisa Uang" (`DashboardScreen.tsx:82`), sementara teks lain berbahasa Inggris. Seed kategori "Prancis" bersifat personal (`database.ts:61`).
- Judul header modal selalu "New Category" walau mode edit (`App.tsx:60`).
- List transaksi memakai `.map` di `ScrollView` (tanpa virtualisasi), sehingga lambat untuk ratusan item.

---

## 7. Fitur setengah jadi, TODO, kode mati

- **PieChart:** `pieData` dihitung (`DashboardScreen.tsx:59-62`) tapi tidak pernah dirender. Library chart dan `react-native-svg` belum terpakai.
- **`deleteTransaction`** (`database.ts:151`) tidak punya UI.
- **Mode kategori bebas** di TransactionForm (`:112-134`) tidak terjangkau dari navigasi mana pun.
- **Widget:** handler `WIDGET_CLICK` / `WIDGET_DELETED` kosong ("Not needed for now", `widget-task-handler.tsx:34-40`). Tidak ada `clickAction` untuk membuka app.
- **CategoryDetail filter bulan:** komentar "can be expanded to filter by month" (`:23`). Detail selalu bulan berjalan, walau Dashboard sedang menampilkan bulan lain.
- **Dependency yatim:** `expo-file-system` + `expo-sharing` (indikasi rencana export/backup), `expo-linear-gradient`.
- "Clear all transaction data **for testing purposes**" (`SettingsScreen.tsx:126`): sisa fitur dev di UI produksi.
- Teks contoh kurs "Rp. 20.000" vs default 17000 (`SettingsScreen.tsx:106` vs `database.ts:45`).
- `.idea/` belum di-`.gitignore`. Semua kode `src/` belum di-commit (hanya ada initial commit dari create-expo-app).

---

## 8. Peluang overhaul

| # | Ide | Alasan | Effort | File terdampak |
|---|---|---|---|---|
| 1 | **Model uang integer + saldo per mata uang** (lihat §9) | Perbaiki bug desimal EUR dan akurasi float, serta pisahkan saldo EUR/IDR | L | `database.ts`, `Input.tsx`, semua screen, `Widget.tsx` |
| 2 | **Skema relasional + migrasi berversi**: `category_id` FK, `PRAGMA user_version`, `foreign_keys=ON`, index | Hilangkan sinkronisasi via nama, transaksi yatim, dan migrasi `try/catch` | M | `database.ts`, `TransactionFormScreen.tsx`, `CategoryDetailScreen.tsx` |
| 3 | **Manajemen transaksi lengkap**: layar daftar semua transaksi (FlatList), edit, hapus (swipe/long-press), date picker, search/filter | Saat ini data salah input tidak bisa dikoreksi; ini gap fungsional terbesar | M | baru `TransactionListScreen.tsx`, `TransactionFormScreen.tsx`, `App.tsx`, `database.ts` |
| 4 | **Fitur Budget sungguhan**: tabel `budgets(category_id, month, limit_minor, currency)` + progress bar dan peringatan over-budget | Sesuai nama app; nilai utama yang belum ada | M | `database.ts`, `DashboardScreen.tsx`, `CategoryDetailScreen.tsx`, `CategoryFormScreen.tsx` |
| 5 | **Recurring yang benar**: tabel `recurring_rules` (start, end, interval, day), materialisasi transaksi per periode, pause/stop | Recurring sekarang abadi, tak bisa dihentikan, dan tidak konsisten antar query | M–L | `database.ts`, `TransactionFormScreen.tsx`, layar baru "Recurring" |
| 6 | **Lapisan domain + hooks + test**: `money.ts` (parse/format), `useMonthlySummary`, `useCategories`, agregasi via SQL `SUM … GROUP BY`; jest-expo + test untuk utils dan query | Hapus duplikasi, perbaiki zona waktu di satu tempat, dan cegah regresi | M | `src/db/*`, baru `src/domain/*`, `src/hooks/*`, semua screen |
| 7 | **Insight & chart**: pie per kategori, tren 6 bulan (library sudah terinstal) | Kode chart sudah setengah jalan; tambah nilai visual dengan effort kecil | S–M | `DashboardScreen.tsx`, `CategoryDetailScreen.tsx` |
| 8 | **Backup/Export/Import** CSV/JSON via `expo-file-system` + `expo-sharing` | Data hanya lokal, dan ada tombol "reset" tanpa backup; dependency sudah ada | S–M | `SettingsScreen.tsx`, baru `src/db/backup.ts` |
| 9 | **Widget yang benar**: currency sesuai setting, ringkasan bulanan, `requestWidgetUpdate` setelah mutasi, klik membuka app atau form tambah | Widget sekarang menampilkan angka yang salah/basi | S | `src/widget/*`, `database.ts`, `TransactionFormScreen.tsx` |
| 10 | **Pass UX/a11y/i18n**: satu bahasa (atau i18n ID/EN), label aksesibilitas, `KeyboardAvoidingView`, validasi inline via `Input.error`, header dinamis, `userInterfaceStyle: dark`, kontras warna | Kualitas dasar mobile dan aksesibilitas | M | semua screen, `components/*`, `app.json`, `colors.ts` |

Urutan yang disarankan: **2 → 1 → 6 → 3 → 9**, lalu 4/5/7/8/10. Perubahan skema sebaiknya dilakukan sekali,
sebelum data pengguna bertambah.

---

## 9. Multi-currency

**Status sekarang**
- Didukung **sebagian**: tiap transaksi punya `currency` `'IDR' | 'EUR'` (`database.ts:10,35`). Union type hardcode di 4+ tempat.
- Semua saldo **dilebur ke satu "display currency"** memakai satu kurs manual global (`getBalance`, `database.ts:155-185`).
  Tidak ada saldo EUR dan saldo IDR yang terpisah.
- Nominal disimpan sebagai **`REAL` (float64)** dan dijumlah dengan float JS. Konversi IDR→EUR (pembagian) menghasilkan pecahan tak hingga.
- Dalam praktik, input EUR desimal **tidak mungkin**, karena `Input.tsx:19` membuang titik/koma (lihat §5 bug #1).
- Kurs `REAL` tunggal tanpa riwayat. Mengubah kurs ikut mengubah semua nilai historis yang dikonversi.

**Yang perlu diubah agar saldo EUR & IDR terpisah dan akurat**
1. **Simpan dalam minor unit integer:** kolom `amount_minor INTEGER` (EUR = sen, ×100; IDR = rupiah utuh, ×1).
   Buat tabel/konstanta `currencies(code, symbol, minor_digits, locale)` dan jangan hardcode union.
2. **Migrasi data:** `UPDATE transactions SET amount_minor = CAST(ROUND(amount * 100) AS INTEGER) WHERE currency='EUR'`,
   dan `ROUND(amount)` untuk IDR (catatan: data EUR lama kemungkinan sudah "×100 tak sengaja" akibat bug input, jadi perlu ditinjau manual).
3. **Saldo per mata uang:** `SELECT currency, SUM(CASE type WHEN 'income' THEN amount_minor ELSE -amount_minor END) … GROUP BY currency`.
   Tampilkan dua kartu saldo (EUR, IDR). Total gabungan hanya sebagai *estimasi* di layer tampilan.
4. **Opsional tapi disarankan:** entitas `accounts(id, name, currency)` (mis. "Dompet IDR", "Bank EUR"), lalu `transactions.account_id`
   menentukan mata uang. Tambahkan tipe **transfer/exchange** dua kaki (EUR keluar, IDR masuk) dengan kurs aktual yang tercatat.
5. **Kurs:** tabel `exchange_rates(date, base, quote, rate_scaled INTEGER)` (mis. rate ×10⁶) atau snapshot kurs per transaksi.
   Konversi dengan kurs pada tanggal transaksi, lalu bulatkan sekali di akhir (banker's/half-up) ke `minor_digits`.
6. **Input & format:** parser locale-aware (terima `,`/`.` desimal sesuai currency, batasi digit desimal = `minor_digits`).
   Format dengan `Intl.NumberFormat(locale, { style: 'currency', currency })`, terpusat di `src/domain/money.ts`.
7. **Widget & UI** membaca format yang sama. Hapus semua simbol hardcode.

---

## 10. Storage

**Jenis:** SQLite lokal via `expo-sqlite` (file `budget.db` di direktori dokumen app), diakses dari dua tempat:
`SQLiteProvider` (`App.tsx:29`) dan koneksi terpisah di widget headless task (`widget-task-handler.tsx:10`).
Tidak ada AsyncStorage, cloud, atau backup.

**Ukuran/efisiensi**
- Per baris transaksi kira-kira 60–90 byte + catatan (REAL 8 B, ISO date 24 B teks, nama kategori teks berulang, `type` 6–7 B, `currency` 3 B).
  10.000 transaksi ≈ 1 MB, jadi **ukuran bukan masalah**. Yang tidak efisien adalah **pola query**.
- Tidak ada index. Filter `strftime('%Y-%m', date)` tidak bisa memakai index (full scan setiap kali).
- `getBalance` memuat **semua baris** ke JS untuk dijumlah dan memanggil `getSettings` setiap kali. CategoryDetail query dua kali.
- Setiap fokus layar memicu reload penuh (tanpa cache/invalidation).
- Tidak ada `PRAGMA journal_mode=WAL` / `foreign_keys` eksplisit, padahal ada dua koneksi (app + widget) ke file yang sama.

**Peluang optimasi**
1. `category_id INTEGER` FK menggantikan nama teks (hemat ruang, rename jadi O(1), integritas terjaga).
2. Simpan tanggal lokal sebagai `date TEXT 'YYYY-MM-DD'` atau `INTEGER` epoch + kolom `month TEXT 'YYYY-MM'`/`INTEGER 202610`,
   lalu `CREATE INDEX idx_tx_month_cat ON transactions(month, category_id)`. Ini sekaligus memperbaiki bug zona waktu.
3. Agregasi di SQL (`SUM … GROUP BY currency, type`) alih-alih di JS. Paginate daftar transaksi (`LIMIT/OFFSET` + FlatList).
4. `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;` di `initDb`, plus `PRAGMA user_version` untuk migrasi berurutan.
5. `CHECK` constraint untuk `type`/`currency`, dan `amount_minor INTEGER` (lihat §9).
6. Cache ringan: hook berbasis `addDatabaseChangeListener` (`enableChangeListener`) atau React Query, agar tidak reload membabi buta.
7. Backup: export file `.db`/JSON via `expo-file-system` + `expo-sharing` (sudah terinstal), lalu import dengan validasi.
