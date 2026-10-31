# BudgetApp — Rencana Overhaul

> Dasar: [BUDGETAPP_REPORT.md](BUDGETAPP_REPORT.md). Status: **disetujui 2026-10-31 dengan revisi** (lihat "Keputusan").
> Kondisi awal (2026-10-31): hanya branch `master`, tanpa remote, Node 22.18, `tsc --noEmit` = 1 error
> (`DashboardScreen.tsx:114`, tipe `style` di `Card`). Semua kode `src/` belum di-commit.

## Progres

| Fase | Status | Catatan |
|---|---|---|
| 0 | ✅ selesai (tag `phase-0-done`) | Build debug Android dengan package id baru berhasil |
| 1 | ✅ selesai (tag `phase-1-done`) | Uji manual di perangkat lolos (2026-10-31) |
| 1.5 | ✅ selesai (tag `phase-1.5-done`) | Disetujui bersama review Fase 1.6 (2026-10-31) |
| 1.6 | ✅ selesai (tag `phase-1.6-done`) | Review screenshot + 5 perbaikan (2026-10-31): count-up saldo, detail kategori bergaya ledger, ringkasan tanpa minus, subtotal harian hanya jika >1 transaksi, ikon adaptif lebih besar |
| 2 | ✅ kode selesai, **menunggu uji manual** | 214 test lolos; typecheck + lint bersih; diuji di emulator (quick-add, pratinjau kurs, transfer + fee, list, edit/ubah tanggal, rename, hapus kategori). Tag `phase-2-done` setelah uji di perangkat |
| 3–5 | belum dimulai | |
| 6 | backlog | Belum dijadwalkan; tiap item butuh persetujuan sendiri |

Penyimpangan dari rencana (Fase 0–1):
- Adapter test memakai build **asm.js** dari sql.js. Build WASM gagal di sandbox VM Jest (`sqlite3_open` → "out of memory"), padahal jalan di Node biasa.
- `expo install -- --save-dev` mengabaikan flag; `eslint-config-expo` dan paket Jest dipindah manual ke `devDependencies`.
- Aturan `parseAmount`: tepat 3 digit setelah pemisah terakhir dibaca sebagai ribuan, jadi EUR "12,505" = €12.505,00 (konsisten dengan "1.234"). `MoneyInput` memformat ulang saat blur, jadi user langsung melihat tafsirannya.
- Kriteria Fase 2 "tanpa `useRoute<any>`/`useNavigation<any>`" sudah terpenuhi di Fase 1.

Penyimpangan dari rencana (Fase 1.5):
- **IBM Plex Sans tidak punya fitur OpenType `tnum`**, tapi semua digit bawaannya sudah sama lebar (600 unit; dicek dengan fontTools).
  Angka sudah tabular tanpa fitur itu. `fontVariant: ['tabular-nums']` tetap dipasang untuk berjaga-jaga jika font diganti.
- Token tambahan `onIdr` (teks gelap di atas isian IDR): `ink` mode gelap di atas `#E0A93A` hanya 1.73:1. `lineStrong` = `#857E70` (light) / `#6B7380` (dark).
- `Button` mendapat varian `income`. `primary` sekarang isian tinta (`ink`), bukan hijau.
- Widget belum di-restyle (masih warna gelap lama); dijadwalkan bersama perombakan widget di Fase 4.

Penyimpangan dari rencana (Fase 1.6):
- Splash native disembunyikan begitu overlay (logo yang sama, posisi sama) selesai di-layout, **bukan** setelah data Dashboard siap.
  Menahan splash lebih lama memblokir frame pertama app, dan jika melewati batas waktu hand-off splash Android, sistem menampilkan jendela hitam
  (terlihat di build debug yang memuat bundle dari Metro). Cap tetap baru dimulai setelah data siap.
- Plugin lokal `plugins/with-night-window-background.js`: latar jendela Android mengikuti token `bg` di light **dan** dark (expo-system-ui hanya light).
- `tsconfig.json`: `allowImportingTsExtensions` + `noEmit`, supaya `scripts/render-brand-assets.ts` bisa dijalankan langsung oleh Node 22.18 dan tetap ikut typecheck.
- Ringkasan bulan di Dashboard menjadi tabel kecil "Arus {bulan}" (`MonthFlow`); `MonthSummaryCard` tetap dipakai di detail kategori.
- Tanda minus masih tanda hubung ASCII dari `formatMoneyParts` (belum diubah ke "−").
- Hasil review: angka saldo **menghitung naik dari 0** (tidak pernah melewati target, tepat di akhir) alih-alih digit odometer;
  detail kategori memakai nama kategori sebagai judul header dan ringkasan bergaris tanpa kartu ("Pengeluaran Oktober € 178,70",
  baris nol disembunyikan); subtotal harian hanya jika hari itu punya >1 transaksi; ikon adaptif ~24% lebih besar dengan sudut bingkai
  lebih bulat (radius 18) agar tetap di lingkaran aman, bilah €/Rp lebih tebal.

Penyimpangan dari rencana (Fase 2):
- Langkah 7–9 (sheet, pratinjau kurs, akun terakhir, edit/hapus) masuk satu commit karena saling terkait; keypad & kategori chip ikut di commit itu.
- Kurs ECB diambil dari `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=IDR` (domain lama `api.frankfurter.app` sekarang redirect 301 ke sana).
  `FxProvider` menyimpan kurs terbaru di context; sync paling banyak sekali sehari (setting `fx_checked_on`), saat start dan saat app kembali ke foreground.
- Pratinjau di quick-add dan total "≈" memakai kurs ECB **terbaru** (tanggalnya ditampilkan), bukan kurs pada tanggal transaksi. Form transfer membandingkan dengan kurs ECB **pada tanggal transfer**.
- Saldo di Dashboard (hero dan daftar akun) dihitung sampai akhir bulan yang dipilih; total "≈" menjumlahkan saldo itu.
- Hapus kategori yang masih dipakai: pilih "Pindahkan…" (layar `CategoryReassign`) atau "Arsipkan". Kategori yang diarsipkan belum bisa dikembalikan dari UI (backlog).
- `MoneyInput` dan `TransactionFormScreen` dihapus; nominal hanya lewat keypad quick-add. Form akun/transfer memakai input teks biasa + `parseAmount`.
- Date picker Android masih bergaya bawaan sistem (teal), belum mengikuti token tema.

## Prinsip kerja

- **Commit kecil per langkah**, format Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`),
  tanpa atribusi AI atau trailer `Co-Authored-By`. Setiap commit harus lolos `npm run typecheck` dan `npm test`.
- Kerja di branch `overhaul` (dari `master`). Setiap fase ditutup dengan tag `phase-N-done`.
- **Data lama tidak dimigrasi.** `budget.db` hanya berisi data uji. Skema dibuat ulang dari nol sebagai `user_version = 1`.
- Logika murni (uang, tanggal, recurrence, budget) ada di `src/domain/` dan wajib diuji. SQL ada di `src/db/` dan diuji lewat adapter `sql.js`.
- Verifikasi UI dilakukan manual di Android (`npx expo run:android`) dengan checklist per fase. Saya akan menuliskan langkah uji. Uji perangkat dilakukan oleh Anda.

## Arsitektur target (ringkas)

```
src/
  config/dev.ts              # flag dev (seed, tombol reset)
  domain/                    # murni, tanpa RN/SQLite: money, dates, recurrence, budget, types
  db/
    client.ts                # interface Db minimal (runAsync/getAllAsync/getFirstAsync/execAsync)
    init.ts                  # PRAGMA + migrate + seed
    migrations/              # 001_initial.ts, 002_transfers_fx.ts, 003_budgets_recurring.ts, index.ts (runner)
    repos/                   # accounts, categories, transactions, transfers, fxRates, budgets, recurring, reports
    seed.ts
    events.ts                # notifyDataChanged() → refresh widget & listener
  fx/                        # frankfurter.ts (ambil kurs ECB), sync.ts (cache harian + fallback)
  theme/                     # tokens.ts (light/dark), typography.ts, ThemeProvider.tsx (useTheme)
  hooks/                     # useAccounts, useMonthSummary, useTransactions, ... (fetch + reload saat fokus/ada perubahan)
  components/                # Txt, Money, Ledger*, Keypad, QuickAddSheet, Button, Input, MoneyInput, AccountPicker, ...
  screens/
  navigation/                # types.ts (RootStackParamList), RootNavigator.tsx
  widget/
test/
  sqljs-db.ts                # adapter Db di atas sql.js (build asm.js, tanpa build native di Windows)
```

---

## Fase 0: Amankan repo

**File:** `.gitignore`, `package.json`, `eslint.config.js`, `src/components/{Card,Button}.tsx`, `app.json`.

**Langkah**
1. Tambahkan `.idea/` ke `.gitignore`.
2. Commit baseline apa adanya: `chore: commit existing app source as baseline` (isi: `src/`, `App.tsx`, `app.json`, `index.ts`, `package*.json`, `BUDGETAPP_REPORT.md`, `PLAN.md`). Lalu buat tag `baseline`.
3. Buat branch `overhaul`.
4. Tambahkan script `typecheck` (`tsc --noEmit`). Perbaiki satu error baseline: `Card.style` diubah menjadi `StyleProp<ViewStyle>`, begitu juga `Button`.
5. Pasang ESLint via `npx expo lint` (config bawaan Expo) dan script `lint`. Perbaiki hanya import yang tidak terpakai, tanpa refactor.
6. Hapus dependency yang pasti tidak dipakai: `expo-linear-gradient`. `expo-file-system` dan `expo-sharing` dipertahankan untuk Fase 4.
7. Ganti `android.package` dari `com.anonymous.BudgetApp` ke `com.daffarivaldi.budgetapp`, lalu jalankan ulang prebuild (`npx expo prebuild --clean -p android`).

**Kriteria selesai**
- `git status` bersih. Tag `baseline` menunjuk ke kode lama.
- `npm run typecheck` dan `npm run lint` lolos tanpa error.
- App masih jalan seperti sebelumnya di Android.

---

## Fase 1: Fondasi data

### Skema v1 (dibuat dari nol)

```sql
-- di luar transaksi, setiap kali DB dibuka (app & widget):
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE accounts (
  id                    INTEGER PRIMARY KEY,
  name                  TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  currency              TEXT    NOT NULL CHECK (currency IN ('IDR','EUR')),  -- satu currency per akun, tidak bisa diubah setelah ada transaksi
  opening_balance_minor INTEGER NOT NULL DEFAULT 0,
  archived              INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  id         INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  archived   INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE transactions (
  id           INTEGER PRIMARY KEY,
  account_id   INTEGER NOT NULL REFERENCES accounts(id)   ON DELETE RESTRICT,
  category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type         TEXT    NOT NULL CHECK (type IN ('income','expense')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),   -- EUR = sen, IDR = rupiah
  date         TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'), -- tanggal LOKAL 'YYYY-MM-DD'
  month        TEXT    GENERATED ALWAYS AS (substr(date, 1, 7)) STORED,                        -- 'YYYY-MM'
  note         TEXT    NOT NULL DEFAULT '',
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tx_account_date   ON transactions(account_id, date);
CREATE INDEX idx_tx_month_category ON transactions(month, category_id);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- key-value, mis. 'default_account_id'
```

Catatan:
- `month` sebagai *generated column* menjamin konsistensi dengan `date`. SQLite bawaan expo-sqlite mendukungnya (≥ 3.31).
  Jika ternyata bermasalah di perangkat, fallback ke kolom biasa yang diisi oleh repo.
- Tidak ada lagi "kurs global" untuk menghitung saldo. Saldo selalu dihitung dalam currency akun. Kurs hanya muncul dari transfer (Fase 2).

### Migrasi & deteksi DB lama

`src/db/migrations/index.ts`:
- Daftar migrasi `[{ version: 1, up }, ...]`. Runner membaca `PRAGMA user_version`, lalu menjalankan setiap `up`
  yang belum diterapkan di dalam `withExclusiveTransactionAsync`, kemudian `PRAGMA user_version = N`.
- **DB lama:** jika `user_version = 0` dan ada tabel lama, hapus **satu per satu** (SQLite tidak mendukung
  beberapa tabel dalam satu `DROP`): `DROP TABLE IF EXISTS transactions;`, `DROP TABLE IF EXISTS categories;`, `DROP TABLE IF EXISTS settings;`.
  Lalu terapkan v1, semuanya dalam satu transaksi. Jika `user_version = 0` tanpa tabel: install baru, langsung v1.
- Jika `user_version` lebih besar dari versi yang dikenal app (downgrade): lempar error yang jelas, tanpa menyentuh data.
- **Akun default:** migrasi v1 membuat `Rekening EUR` (EUR) dan `Rekening IDR` (IDR) jika tabel `accounts` kosong,
  **terlepas dari flag seed**. Saldo awal keduanya 0.

### Seed data contoh

- `src/config/dev.ts`: `export const SEED_SAMPLE_DATA = __DEV__ && process.env.EXPO_PUBLIC_SEED_SAMPLE_DATA !== 'false'`.
  Seed aktif secara default di dev, bisa dimatikan dengan `EXPO_PUBLIC_SEED_SAMPLE_DATA=false` di `.env.local`, dan **tidak pernah** jalan di build release.
- Seed **hanya menambah data contoh**, tidak membuat ulang akun default. Seed jalan sekali saja, ditandai lewat `settings.sample_data_seeded = '1'`,
  agar data contoh tidak muncul lagi setelah semua transaksi dihapus.
- Isi seed (deterministik, relatif terhadap bulan berjalan, mencakup 3 bulan terakhir, tanpa tanggal di masa depan):
  - Akun tambahan: `Dompet Tunai` (IDR, saldo awal Rp 750.000). Transaksi lain memakai dua akun default.
  - Kategori: Gaji, Sewa, Makanan & Belanja, Transportasi, Tagihan, Hiburan, Kesehatan, Lainnya.
  - Sekitar 40 transaksi, misalnya: gaji €1.850,00/bulan, sewa €650,00, belanja €23,45 / €61,80, tiket €2,90,
    makan Rp 35.000, ojek Rp 18.500, pulsa Rp 100.000, listrik Rp 450.000. Nominal EUR sengaja memakai sen untuk menguji pembulatan.
- Di Settings, tampil tombol **"Reset & seed ulang"** hanya saat `__DEV__`.

### `src/domain/money.ts` + test

- `CurrencyCode = 'IDR' | 'EUR'`, dan `CURRENCIES: Record<CurrencyCode, { symbol, minorDigits, locale }>` (IDR: 0 digit, `id-ID`; EUR: 2 digit).
- `parseAmount(text, currency): number | null`: string ke minor unit integer. Menerima `12,50`, `12.50`, `1.234,56`, dan `1234`.
  Untuk IDR, semua `.`/`,` dianggap pemisah ribuan. Fungsi menolak nilai negatif, kosong, desimal lebih dari `minorDigits`, dan nilai di atas `Number.MAX_SAFE_INTEGER`.
- `formatMoney(minor, currency, { sign? })` memformat secara **manual dan deterministik** (titik ribuan, koma desimal, simbol di depan:
  "Rp 12.500", "€ 12,50"), tanpa `Intl`, karena `Intl` di Hermes bisa berbeda dari Node. Hasilnya tetap dicek di perangkat (checklist).
- `formatInputValue(minor, currency)` dipakai untuk mengisi ulang input saat mode edit.
- `impliedRate(fromMinor, fromCcy, toMinor, toCcy)` dan `convertMinor(minor, rate)`, dengan pembulatan half-up memakai aritmetika integer.
- `src/domain/dates.ts`: `todayLocal()`, `monthOf(date)`, `addMonths(month, n)`, `monthRange`, `formatMonthLabel`. Semua berbasis tanggal lokal, tanpa `toISOString()`.
- Test: `src/domain/__tests__/money.test.ts`, `dates.test.ts` (termasuk batas bulan, Februari, dan pergantian tahun).

### File yang diubah/dibuat

- **Baru:** `src/config/dev.ts`, `src/domain/{money,dates,types}.ts` + tests, `src/db/{client,init,seed,events}.ts`,
  `src/db/migrations/{index,001_initial}.ts`, `src/db/repos/{accounts,categories,transactions,reports,settings}.ts`,
  `src/components/MoneyInput.tsx`, `src/components/AccountPicker.tsx`, `test/sqljs-db.ts`, `jest.config.js`.
- **Diubah:** `App.tsx` (`onInit={initDb}` dari `src/db/init.ts`), `TransactionFormScreen.tsx` (pilih akun alih-alih currency, `MoneyInput`, `category_id`),
  `DashboardScreen.tsx` dan `CategoryDetailScreen.tsx` (total dikelompokkan per currency, sementara), `SettingsScreen.tsx` (hapus kurs/display currency, tambah reset dev),
  `Widget.tsx` + `widget-task-handler.tsx` (adaptasi minimal: saldo per akun).
- Semua screen yang disentuh langsung memakai **teks bahasa Indonesia** (sesuai Keputusan #2). Ekstraksi ke `src/i18n/` tetap di Fase 5.
- Flag `recurring` lama dihapus di Fase 1 dan kembali sebagai recurring rules di Fase 3.
- **Dihapus:** `src/db/database.ts`.

### Langkah (satu commit per poin)
1. `chore: set up jest-expo` (`npx expo install jest-expo jest @types/jest -- --save-dev`, script `test`, satu smoke test).
2. `feat(domain): add money parsing/formatting with tests`.
3. `feat(domain): add local date helpers with tests`.
4. `test: add sql.js Db adapter` + `feat(db): add Db client interface`.
5. `feat(db): add migration runner with legacy reset` + test (DB kosong → v1; DB lama → drop + v1; versi lebih tinggi → error).
6. `feat(db): add schema v1` + test constraint (FK RESTRICT, CHECK amount > 0, generated `month`).
7. `feat(db): enable WAL and foreign keys on open`.
8. `feat(db): add accounts/categories/transactions repos` + test query saldo dan ringkasan bulan per currency.
9. `feat(db): add dev seed data behind flag` + test idempoten (seed tidak dobel).
10. `feat(ui): add MoneyInput with per-currency decimals`.
11. `refactor: switch screens to new repos` + `refactor: remove legacy database.ts`.

**Kriteria selesai**
- `npm test` lolos: money, dates, migrasi (3 skenario), constraint, repo, seed.
- Install di atas DB lama: app tidak crash, `PRAGMA user_version = 1`, dan data seed muncul.
- Dengan seed dimatikan: hanya ada dua akun default dan tidak ada transaksi.
- **Cek di perangkat (Hermes):** `formatMoney` untuk EUR dan IDR tampil sama persis dengan hasil test Node
  (mis. "€ 1.234,56", "Rp 1.250.000", tanda negatif, nol).
- Input `€12,50` tersimpan sebagai `amount_minor = 1250` dan tampil sebagai "€12,50".
- Transaksi yang dibuat jam 00:30 waktu lokal tanggal 1 masuk ke bulan yang benar.
- `grep -r "amount REAL\|toISOString" src` kosong (kecuali di test). `database.ts` sudah tidak ada.

---

## Fase 1.5: Design system "Buku Kas"

Tujuan: semua layar baru di Fase 2+ langsung memakai gaya ini. Arah visual mengikuti Opsi A di [docs/RESEARCH.md](docs/RESEARCH.md):
kertas hangat / tinta arang, angka tabular sebagai elemen utama, warna hanya untuk makna (EUR, IDR, pengeluaran, pemasukan).
Bagian visual dari Fase 5 (kontras, tema, splash) dipindah ke sini.

### Token warna (ikut light/dark sistem)

| Token | Light | Dark | Dipakai untuk |
|---|---|---|---|
| `bg` | `#F4F1EA` | `#16181D` | latar layar |
| `surface` | `#FBFAF6` | `#1F232A` | sheet, kartu saldo, input |
| `ink` | `#1C1B19` | `#ECE8DF` | teks utama |
| `inkMuted` | `#5F5B53`* | `#A39E93`* | teks sekunder, label |
| `line` | `#D9D4C7` | `#323843`* | garis buku kas (dekoratif) |
| `eur` | `#2E4A8B` | `#9DB2EA`* | tanda/teks EUR |
| `idr` | `#C98A0B` | `#E0A93A`* | tanda/isian IDR (teks di atasnya pakai `ink`) |
| `idrText` | `#8A5D00`* | `#E0A93A`* | teks IDR di atas `bg`/`surface` |
| `expense` | `#B23A2E` | `#E8877B`* | pengeluaran |
| `income` | `#2F7D4F` | `#6FC08F`* | pemasukan (isian, teks di `surface`) |
| `incomeText` | `#2A7047`* | `#6FC08F`* | teks pemasukan di atas `bg` |

\* = usulan saya, bukan dari riset. Semua kombinasi teks/latar di atas sudah dihitung ≥ 4.5:1 (AA).
**Nilai riset yang gagal AA sebagai teks** dan karena itu diberi varian:
- light: IDR `#C98A0B` di `bg` = 2.61:1; income `#2F7D4F` di `bg` = 4.47:1.
- dark: EUR `#2E4A8B` = 2.09:1, expense `#B23A2E` = 2.99:1, income `#2F7D4F` = 3.52:1 di `#16181D`.

Garis `line` sengaja tipis (dekoratif, sekitar 1.3–1.5:1). Batas komponen interaktif (input, chip) memakai `lineStrong` ≥ 3:1 (WCAG 1.4.11), ditentukan dan dites saat implementasi.

### Tipografi & angka
- **IBM Plex Sans** (400/500/600/700) untuk UI dan angka, **IBM Plex Mono** (500) untuk kode mata uang kecil (`EUR`, `IDR`).
  Font di-embed lewat config plugin `expo-font` (paket `@expo-google-fonts/ibm-plex-sans` dan `/ibm-plex-mono`), jadi tidak ada loading/flash saat start.
  Di Android, `fontWeight` tidak andal untuk font custom, jadi komponen `<Txt>` memetakan bobot ke nama file font.
- **`<Money>`**: render `formatMoneyParts()` (tanda, simbol, angka) dengan `fontVariant: ['tabular-nums']`, ukuran display/title/body/caption, warna otomatis
  (income/expense/netral) atau warna mata uang. Fitur `tnum` **wajib diuji di perangkat** (lihat kriteria).

### Komposisi
- Daftar transaksi berupa **baris bergaris ala buku kas** (garis tipis, tanpa kartu), dikelompokkan per tanggal dengan subtotal harian per mata uang.
- Kartu hanya untuk 1–2 elemen utama (kartu saldo). Radius 4 px (input, chip) dan 8 px (kartu, sheet). Tanpa bayangan/elevation, gradien, glow, emoji,
  atau lingkaran huruf awal. Grid kartu kategori di Dashboard menjadi daftar baris.
- `app.json`: `userInterfaceStyle: "automatic"` (+ `expo-system-ui`), splash dan latar adaptive icon versi light/dark.

### File
- **Baru:** `src/theme/{tokens,typography}.ts`, `src/theme/ThemeProvider.tsx` (`useTheme()` via `useColorScheme`), `src/theme/__tests__/contrast.test.ts`,
  `src/components/{Txt,Money,LedgerSection,LedgerRow}.tsx`.
- **Diubah:** `App.tsx` (provider, tema navigasi dari token, `StatusBar style="auto"`), `src/domain/money.ts` (`formatMoneyParts`), semua komponen di `src/components/`,
  semua screen, `app.json`, `package.json`.
- **Dihapus:** `src/theme/colors.ts`.

### Langkah
1. `feat(theme): add light/dark semantic tokens with contrast test`.
2. `feat(theme): follow system color scheme` (ThemeProvider, tema navigasi, status bar, `expo-system-ui`, `userInterfaceStyle: automatic`).
3. `chore: embed IBM Plex Sans and Plex Mono` + `feat(ui): add Txt typography component`.
4. `feat(domain): add formatMoneyParts` + test, lalu `feat(ui): add Money component with tabular figures`.
5. `feat(ui): add ledger section and row components`.
6. `refactor(ui): restyle primitives` (Button, Input, MoneyInput, AccountPicker, Card, MonthSummaryCard).
7. `refactor(ui): restyle screens` (Dashboard: daftar kategori; CategoryDetail: ledger; form; Pengaturan).
8. `chore(app): light/dark splash and adaptive icon background`.
9. `refactor: remove legacy colors module`.

**Kriteria selesai**
- `contrast.test.ts` lolos: setiap token teks di atas `bg` dan `surface` ≥ 4.5:1 di kedua mode, `lineStrong` ≥ 3:1.
- `grep -rn "colors\.\|#121212\|shadow\|elevation\|LinearGradient" src` kosong.
- Manual (perangkat):
  - Ganti tema sistem light↔dark: app ikut berubah tanpa restart, termasuk header navigasi dan status bar.
  - Teks memakai IBM Plex (bukan Roboto). Kode `EUR`/`IDR` memakai Plex Mono.
  - **Tabular nums:** kolom nominal di daftar transaksi rata per digit (mis. "€ 1.111,11" dan "€ 8.888,88" sama lebar). Jika tidak, `tnum` tidak aktif dan harus diperbaiki sebelum lanjut.
  - Tidak ada bayangan, gradien, atau emoji. Daftar transaksi bergaris tanpa kartu.
  - Splash tidak "berkedip putih" di mode gelap.

---

## Fase 1.6: Identitas "Rupiero"

Tujuan: app punya nama, logo, dan layar pembuka sendiri sebelum fitur Fase 2 ditumpuk di atasnya. Tetap gaya Buku Kas: tinta di atas kertas,
warna hanya untuk makna.

### Nama
- Nama tampilan **Rupiero**: `app.json` `name` (menjadi `app_name`/label launcher Android) dan label widget.
- `slug`, package id `com.daffarivaldi.budgetapp`, dan nama file `budget.db` **tidak** diganti (mengganti package id = app baru di perangkat).

### Logo
- Monogram **"R"** dengan dua garis horizontal seperti pada tanda €, bergaya stempel/cap di atas garis ledger.
  Garis atas memakai token `eur`, garis bawah `idrText`, huruf dan bingkai memakai `ink`. Dibangun dari bentuk geometris (bukan font),
  jadi tajam di semua ukuran.
- Satu sumber: `src/brand/mark.ts` (`buildMarkSvg(colors)`). Dipakai oleh `<RupieroMark>` (react-native-svg) dan oleh
  `scripts/render-brand-assets.ts` (resvg) yang membuat PNG: `icon.png`, `adaptive-icon.png` (+ `adaptive-icon-monochrome.png` untuk
  ikon bertema Android 13), `splash-icon.png`, `splash-icon-dark.png`, `favicon.png`. SVG kanonik disimpan di `assets/brand/`.
- Wordmark di header = logo + "Rupiero" (IBM Plex Sans Bold).

### Header & Dashboard
- Dashboard memakai **header custom** (header bawaan disembunyikan): wordmark di kiri, pemilih bulan, ikon pengaturan (SVG, bukan teks).
  Layar lain tetap memakai header bawaan dengan tombol kembali.
- **Saldo EUR dan IDR** sebagai angka besar (varian `hero`, 52 pt, mengecil otomatis sampai muat) dan menjadi elemen paling dominan.
  Langsung di atas latar, tanpa kartu berbingkai, dipisah garis ledger.
  Saldo = saldo awal + transaksi sampai akhir bulan yang dipilih (bulan berjalan = saldo saat ini). Repo: `getBalancesByCurrency(db, { asOf })`.
- Ringkasan bulan (pemasukan/pengeluaran per mata uang) turun menjadi baris kecil di bawah saldo.
- Daftar kategori menampilkan total bulan ini per mata uang di kanan (bertanda, warna income/expense). Repo: `getCategoryMonthTotals(db, month)`.
- Detail kategori: tombol Pemasukan/Pengeluaran menjadi outline. Transaksi tanpa catatan tidak menampilkan teks pengganti.

### Animasi buka
- Splash native statis (logo) → logo **"dicap"** (Reanimated 4: angkat, tekan, jejak tinta, ±600 ms) → **angka saldo bergulir**
  (digit berputar lalu berhenti kiri ke kanan; panjang teks tetap, jadi tata letak tidak bergeser). Total < 1 detik.
- Splash native disembunyikan setelah data Dashboard pertama siap (dengan batas waktu cadangan), jadi tidak ada layar kosong.
- **"Kurangi animasi"** sistem aktif → tanpa cap dan tanpa gulir; splash langsung hilang dan angka tampil final.
- Hanya saat cold start; ganti bulan tidak memutar animasi.

### File
- **Baru:** `src/brand/{mark.ts,RupieroMark.tsx,Wordmark.tsx}`, `src/brand/__tests__/mark.test.ts`, `src/components/{SettingsIcon,BalanceHero,AppHeader}.tsx`,
  `src/components/rolling.ts` (+ test), `src/intro/IntroProvider.tsx`, `scripts/render-brand-assets.ts`, `assets/brand/*.svg`.
- **Diubah:** `app.json`, `package.json` (react-native-reanimated, react-native-worklets, @resvg/resvg-js dev), `App.tsx`, `src/theme/typography.ts` (`hero`),
  `src/db/repos/{accounts,reports}.ts` (+ test), `src/screens/{DashboardScreen,CategoryDetailScreen}.tsx`, aset ikon/splash.

### Langkah
1. `chore(app): rename display name to Rupiero`.
2. `chore: add react-native-reanimated and worklets`.
3. `feat(brand): add Rupiero stamp mark` + `chore(brand): generate icon and splash assets from the mark`.
4. `feat(db): balances by currency as of a date` + `feat(db): category totals per month`.
5. `feat(ui): custom dashboard header with wordmark, month picker and settings icon`.
6. `feat(dashboard): hero balances on the page and category totals`.
7. `refactor(ui): outline actions and no placeholder note in category detail`.
8. `feat(app): stamp intro and rolling balances`.

**Kriteria selesai**
- Typecheck, lint, dan semua test lolos (termasuk test baru untuk saldo per tanggal, total kategori, `rolling`, dan `buildMarkSvg`).
- Manual (perangkat/emulator):
  - Label launcher "Rupiero"; ikon adaptif dan ikon bertema terlihat benar; splash light/dark memakai logo.
  - Saldo EUR/IDR adalah elemen terbesar di Dashboard, di kedua mode.
  - Cold start: splash → cap → angka bergulir, terasa < 1 detik. Dengan "Hapus animasi" aktif: tanpa animasi.
- Screenshot light + dark dikirim untuk review.

---

## Fase 2: Fitur inti

### Skema v2 (migrasi `002_transfers_fx.ts`)

```sql
CREATE TABLE transfers (
  id                INTEGER PRIMARY KEY,
  from_account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  from_amount_minor INTEGER NOT NULL CHECK (from_amount_minor > 0),
  to_amount_minor   INTEGER NOT NULL CHECK (to_amount_minor > 0),     -- kurs aktual = rasio keduanya, tanpa float tersimpan
  fee_minor         INTEGER NOT NULL DEFAULT 0 CHECK (fee_minor >= 0), -- dalam currency akun asal, di luar from_amount
  date              TEXT    NOT NULL,
  month             TEXT    GENERATED ALWAYS AS (substr(date, 1, 7)) STORED,
  note              TEXT    NOT NULL DEFAULT '',
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (from_account_id <> to_account_id)
);
CREATE INDEX idx_transfer_from ON transfers(from_account_id, date);
CREATE INDEX idx_transfer_to   ON transfers(to_account_id, date);

-- kurs referensi ECB (via Frankfurter), hanya EUR→IDR, satu baris per tanggal kurs.
-- Kurs IDR→EUR tidak disimpan; diturunkan saat dihitung (invertRate).
CREATE TABLE fx_rates (
  date       TEXT    NOT NULL,                                   -- tanggal kurs ECB, bukan tanggal fetch
  base       TEXT    NOT NULL DEFAULT 'EUR' CHECK (base = 'EUR'),
  quote      TEXT    NOT NULL DEFAULT 'IDR' CHECK (quote = 'IDR'),
  rate_micro INTEGER NOT NULL CHECK (rate_micro > 0),            -- 1 EUR = rate_micro / 1.000.000 IDR (tanpa float)
  source     TEXT    NOT NULL DEFAULT 'ecb-frankfurter',
  fetched_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (date, base, quote)
);

-- buku besar terpadu untuk saldo & daftar transaksi
CREATE VIEW ledger AS
  SELECT 'tx' AS kind, id, account_id, category_id, date, month,
         CASE type WHEN 'income' THEN amount_minor ELSE -amount_minor END AS signed_minor, note
    FROM transactions
  UNION ALL SELECT 'transfer_out', id, from_account_id, NULL, date, month, -from_amount_minor, note FROM transfers
  UNION ALL SELECT 'transfer_in',  id, to_account_id,   NULL, date, month,  to_amount_minor,  note FROM transfers
  UNION ALL SELECT 'transfer_fee', id, from_account_id, NULL, date, month, -fee_minor,         note FROM transfers WHERE fee_minor > 0;
```

- Jumlah transfer **bukan** income/expense, sehingga tidak ikut ringkasan pemasukan/pengeluaran, tapi memengaruhi saldo akun.
- **Fee transfer dihitung sebagai pengeluaran** berlabel "Biaya transfer" di ringkasan bulanan (uangnya memang hilang), tapi tidak masuk budget kategori.
- Setting baru (tabel `settings`): `last_account_id` (default quick-add), `base_currency` (mata uang total gabungan, default `EUR`).

**Konversi tanpa overflow dan tanpa kehilangan presisi** (`src/domain/fx.ts` + `money.ts`):
- Baris `fx_rates` diubah menjadi `ExchangeRate { from: 'EUR', to: 'IDR', fromMinor: 100 × 1.000.000, toMinor: rate_micro }` (keduanya integer).
  IDR→EUR = `invertRate()` dari kurs yang sama, tidak pernah disimpan.
- Semua perkalian/pembagian konversi memakai **BigInt** (`convertMinor`), dengan **satu** pembulatan half-up di akhir.
  Hasil akhir harus aman sebagai `number` (`Number.isSafeInteger`); jika tidak, lempar `RangeError` alih-alih mengembalikan angka yang salah.
- Test wajib (kurs ECB 30 Okt 2026: 1 EUR = 20.275,17 IDR, `rate_micro = 20275170000`):
  - €100.000,00 → **Rp 2.027.517.000** (hasil antara 2,0 × 10¹⁷ > `MAX_SAFE_INTEGER`).
  - Rp 10.000.000.000 → **€ 493.214,11** (hasil antara 10¹⁸).
  - Presisi: €9.007.199.261,76 → **Rp 182.622.496.256.058** (aritmetika float memberi …059).
  - Batas pembulatan half-up tepat di ,5, nilai negatif simetris, dan hasil di luar rentang aman ditolak.
  - Kurs turunan IDR→EUR konsisten: konversi bolak-balik selisih paling banyak 1 minor unit dari pembulatan.

### Fitur & file
- **Saldo per akun:** Dashboard menampilkan dua saldo besar per mata uang (jumlah akun EUR, jumlah akun IDR) dengan `<Money>`, daftar akun, dan ringkasan income/expense
  bulan terpilih per currency. Daftar kategori menampilkan total pengeluaran bulan ini.
  File: `DashboardScreen.tsx`, `components/{BalanceHeader,AccountRow,MonthSelector}.tsx`, `repos/reports.ts`, `hooks/useMonthSummary.ts`.
- **Kurs ECB (`fx_rates`):** `src/fx/frankfurter.ts` mengambil kurs EUR→IDR terbaru (endpoint Frankfurter diverifikasi saat implementasi, timeout 5 detik).
  `src/fx/sync.ts` mengambil paling banyak sekali sehari saat app start/foreground jika kurs tersimpan lebih lama dari hari ini. Saat offline, gagal diam-diam dan memakai kurs terakhir.
  `repos/fxRates.ts` (simpan/ambil terbaru per tanggal), `domain/fx.ts` (ubah `rate_micro` ke `ExchangeRate`, turunkan IDR→EUR).
- **Total gabungan "≈":** semua saldo dikonversi ke `base_currency` (default EUR) memakai kurs ECB terbaru, ditampilkan sebagai baris kecil
  "≈ € 2.957,57 total · kurs ECB 30 Okt" (data contoh). Total ini disembunyikan jika belum pernah ada kurs tersimpan.
- **Quick-add bottom sheet** (menggantikan `TransactionFormScreen` untuk tambah **dan** edit):
  - `@gorhom/bottom-sheet` v5 dengan `react-native-reanimated` 4 + `react-native-worklets` (plugin `react-native-worklets/plugin` di `babel.config.js` jika preset belum memasangnya),
    `react-native-gesture-handler` (`GestureHandlerRootView` + `BottomSheetModalProvider` di `App.tsx`). Semua dipasang via `npx expo install`; perlu build native baru.
  - **Keypad custom** (`components/Keypad.tsx`): angka, `000`, pemisah desimal hanya untuk EUR, hapus, dan operator `+ − × ÷`.
    **Kalkulator** di `src/domain/calc.ts`: evaluasi ekspresi langsung ke minor unit dengan aritmetika integer (× dan ÷ dibulatkan half-up), plus test.
  - **Kategori 1 tap:** 8 kategori paling sering dipakai 90 hari terakhir sebagai chip, plus "Semua…". **Akun terakhir** (`last_account_id`) jadi default.
  - **Haptics** (`expo-haptics`): `selectionAsync` per tombol keypad, `notificationAsync(Success)` saat simpan.
  - **Pratinjau konversi:** saat mengetik EUR tampil "≈ Rp 253.440", dan sebaliknya, memakai kurs ECB terbaru beserta tanggalnya (disembunyikan jika belum ada kurs).
  - Chip tanggal (default "Hari ini", membuka `@react-native-community/datetimepicker`) dan catatan opsional. Mode edit memuat transaksi yang sama ke sheet, plus tombol Hapus.
  - File: `components/{QuickAddSheet,Keypad,CategoryChips}.tsx`, `hooks/useQuickAdd.ts`, `repos/transactions.ts` (update/delete, kategori terpopuler).
- **Kelola akun:** `AccountsScreen.tsx` dan `AccountFormScreen.tsx` (tambah, ganti nama, arsip; currency terkunci jika akun sudah punya transaksi).
- **List transaksi:** `TransactionListScreen.tsx` memakai `FlatList` + komponen ledger dari Fase 1.5, dikelompokkan per tanggal, dengan filter bulan/akun/kategori/tipe
  dan pagination (`LIMIT/OFFSET`). Transfer dan fee ikut tampil. Tap baris membuka quick-add sheet dalam mode edit.
- **Transfer:** `TransferFormScreen.tsx`. Pengguna memilih akun asal dan tujuan, mengisi nominal kirim, nominal terima, dan fee (opsional, currency akun asal).
  Tampil kurs aktual (mis. "1 EUR = Rp 17.100") dan selisihnya dengan kurs ECB hari itu. Jika currency sama, nominal terima otomatis = nominal kirim.
  Transfer bisa diedit dan dihapus. Repo: `repos/transfers.ts`.
- **Navigasi:** `src/navigation/{types,RootNavigator}.tsx` dengan params bertipe.
  - Edit kategori: `goBack()`. Detail hanya menerima `categoryId` dan membaca nama dari DB saat fokus.
  - Hapus kategori/akun: `popTo('Dashboard')`.
  - Judul header dinamis (Tambah/Edit).
  - CategoryDetail menerima param `month` dari Dashboard.
- **Hapus kategori:** ditolak jika masih dipakai (FK RESTRICT). UI menawarkan "pindahkan transaksi ke kategori lain" atau "arsipkan".

### Langkah
1. `feat(db): add transfers with fee, fx_rates and ledger view (v2)` + test saldo dengan transfer lintas currency dan fee.
2. `feat(db): add transfer and fx rate repos` + test (kurs implisit, larangan akun sama, kurs terbaru per tanggal, hanya EUR→IDR yang diterima).
   Lalu `feat(domain): derive EUR/IDR rates with BigInt conversion` + test overflow/presisi di atas.
3. `feat(fx): fetch ECB rates from Frankfurter with daily cache` + test (fetch di-mock: sukses, offline, respons rusak, tidak fetch dua kali sehari).
4. `feat(domain): calculator expressions in minor units` + test.
5. `refactor(nav): typed root navigator`, `fix(nav): use goBack/popTo after category edit/delete`, dan `fix(nav): dynamic header titles`.
6. `chore: add bottom sheet, reanimated, gesture handler, haptics and date picker`.
7. `feat: quick-add sheet with keypad, calculator and category chips`.
8. `feat: conversion preview in quick-add` dan `feat: remember last account`.
9. `feat: edit and delete transactions in the sheet` + `refactor: remove TransactionFormScreen`.
10. `feat: accounts list and form`.
11. `feat: per-currency balances with ≈ combined total on dashboard`.
12. `feat: transaction list with filters and pagination`.
13. `feat: transfer between accounts with actual rate and fee`.
14. `feat: reassign or archive category on delete`.

**Kriteria selesai**
- Test: saldo akun benar setelah income, expense, transfer EUR→IDR dengan fee, edit, dan hapus. Jumlah transfer tidak memengaruhi total income/expense, fee masuk sebagai pengeluaran.
  Kalkulator: `12,5+3,2` = 1570 (EUR), `10000×3` = 30000 (IDR), pembagian dibulatkan half-up, ekspresi tidak valid ditolak.
  Konversi: semua test BigInt di atas lolos (€100.000 dan Rp 10.000.000.000 tanpa overflow, kasus presisi float).
- Manual:
  - **Tambah transaksi < 5 detik:** buka sheet, ketik `12,5+3,2`, tap kategori, simpan. Tersimpan €15,70 di akun terakhir, dengan haptic terasa.
  - Pratinjau konversi menampilkan "≈ Rp …" dengan tanggal kurs ECB. Dalam mode pesawat, kurs terakhir tetap dipakai. Install baru tanpa internet: total "≈" dan pratinjau tersembunyi.
  - Transfer €200,00 → Rp 3.420.000 dengan fee €1,50: saldo EUR turun €201,50, saldo IDR naik Rp 3.420.000, kurs tampil "1 EUR = Rp 17.100", dan pengeluaran bulan ini bertambah €1,50 "Biaya transfer".
  - Edit dan hapus transaksi dari list berfungsi. Tanggal bisa diatur mundur, dan transaksinya muncul di bulan yang benar.
  - Setelah rename/hapus kategori, tombol back tidak membuka layar usang atau form.

---

## Fase 3: Budget per kategori/bulan, recurring rules, langganan

### Skema v3 (migrasi `003_budgets_recurring.ts`)

```sql
CREATE TABLE budgets (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month       TEXT    NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  currency    TEXT    NOT NULL CHECK (currency IN ('IDR','EUR')),  -- realisasi = expense kategori dari akun ber-currency ini
  limit_minor INTEGER NOT NULL CHECK (limit_minor > 0),
  UNIQUE (category_id, month, currency)
);

CREATE TABLE recurring_rules (
  id                  INTEGER PRIMARY KEY,
  account_id          INTEGER NOT NULL REFERENCES accounts(id)   ON DELETE RESTRICT,
  category_id         INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type                TEXT    NOT NULL CHECK (type IN ('income','expense')),
  amount_minor        INTEGER NOT NULL CHECK (amount_minor > 0),
  note                TEXT    NOT NULL DEFAULT '',
  frequency           TEXT    NOT NULL CHECK (frequency IN ('weekly','monthly','yearly')),
  interval_count      INTEGER NOT NULL DEFAULT 1 CHECK (interval_count >= 1),
  start_date          TEXT    NOT NULL,
  end_date            TEXT,                      -- NULL = tanpa akhir; "stop" = isi tanggal ini
  paused              INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0,1)),
  last_generated_date TEXT
);

ALTER TABLE transactions ADD COLUMN recurring_rule_id INTEGER REFERENCES recurring_rules(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX idx_tx_rule_date ON transactions(recurring_rule_id, date) WHERE recurring_rule_id IS NOT NULL;
```

### Fitur & file
- **Budget:** `BudgetScreen.tsx` (per bulan) menampilkan daftar kategori dengan progress bar (terpakai / limit, per currency), tombol "Salin dari bulan lalu", dan peringatan ≥ 80% / > 100%.
  Progress juga tampil di `CategoryDetailScreen.tsx`, dan ringkasan kategori yang over-budget tampil di Dashboard.
  Domain: `src/domain/budget.ts` (status, persentase, sisa budget per currency). Repo: `repos/budgets.ts`.
- **Recurring:**
  - `src/domain/recurrence.ts` berisi `occurrences(rule, fromDate, toDate)`. Tanggal 29–31 dijepit ke akhir bulan, dan aturan `paused`/`end_date` dihormati.
  - `repos/recurring.ts` berisi `materializeDue(today)`: membuat transaksi yang jatuh tempo sampai **hari ini** (bukan masa depan). Fungsi ini idempoten berkat unique index, dan dipanggil saat app start, saat app kembali ke foreground (`AppState`), dan dari widget.
  - `RecurringListScreen.tsx` (daftar aturan; pause/lanjut/stop/hapus) dan `RecurringFormScreen.tsx`. Di quick-add sheet ada toggle "Ulangi" yang membuat aturan beserta kemunculan pertamanya.
  - Mengedit aturan hanya berlaku untuk kemunculan berikutnya. Transaksi yang sudah dibuat tetap ada dan bisa diedit satu per satu.
- **Langganan:** `SubscriptionsScreen.tsx` menampilkan recurring rules pengeluaran yang aktif (mis. Spotify, Free Mobile, asuransi):
  nominal, frekuensi, tanggal jatuh tempo berikutnya, dan **total per bulan per mata uang** (mingguan ×52/12, tahunan ÷12, dibulatkan per minor unit).
  Domain: `monthlyEquivalent(rule)` dan `nextDueDate(rule, today)` di `recurrence.ts`.

### Langkah
1. `feat(db): add budgets and recurring_rules (v3)` + test migrasi v2→v3.
2. `feat(domain): recurrence occurrences with tests` (akhir bulan, tahun kabisat, weekly/yearly, interval, pause, end).
3. `feat(db): idempotent recurring materialization` + test (dua kali jalan, hasilnya tetap sama).
4. `feat(domain): budget status with tests`.
5. `feat: budget screen with copy-from-previous-month`.
6. `feat: budget progress on dashboard and category detail`.
7. `feat: recurring rules list and form` dan `feat: repeat toggle in quick-add`.
8. `feat: materialize recurring on start and foreground`.
9. `feat(domain): monthly equivalent and next due date` + test, lalu `feat: subscriptions view`.

**Kriteria selesai**
- Test: aturan bulanan tanggal 31 menghasilkan 28/29 Feb, 30 Apr, dst. Materialisasi ganda tidak membuat duplikat. Aturan yang di-stop tidak menghasilkan transaksi baru.
  Ekuivalen bulanan: €9,99/minggu → €43,29/bulan, Rp 1.200.000/tahun → Rp 100.000/bulan.
- Manual: set budget Makanan €300 lalu catat €250, progress tampil 83% dengan warna peringatan. "Salin dari bulan lalu" berfungsi.
  Aturan sewa bulanan muncul sekali per bulan dan berhenti setelah di-stop. Layar langganan menampilkan total EUR dan IDR terpisah.
- Total widget/Dashboard/list konsisten (recurring sekarang berupa transaksi nyata, bukan hitungan semu).

---

## Fase 4: Widget, chart, backup

### File & fitur
- **Widget** (`src/widget/*`, `src/db/events.ts`, `app.json`):
  - Widget menampilkan **sisa budget bulan ini per mata uang** (total limit − terpakai untuk kategori ber-budget; jika belum ada budget, saldo per mata uang), diformat via `money.ts`
    dan berwarna sesuai token Buku Kas.
  - **Quick-add via deep link:** tombol "+ EUR" dan "+ IDR" membuka `budgetapp://add?account=<id>` (opsional `&category=<id>`), yang langsung membuka quick-add sheet terisi.
    `scheme` di `app.json`, `linking` di navigator, dan parameter divalidasi (id tak dikenal diabaikan).
  - Handler membuka DB lewat `initDb` yang sama (PRAGMA, migrasi) dan menjalankan `materializeDue`.
  - `notifyDataChanged()` dipanggil di setiap mutasi repo, lalu memicu `requestWidgetUpdate`. Tap area lain membuka app.
- **Chart** (`DashboardScreen.tsx` atau `InsightsScreen.tsx` baru, `repos/reports.ts`), gaya Buku Kas:
  - Donut tipis pengeluaran per kategori untuk bulan terpilih (per currency), tanpa label di dalam, dengan legenda tabel di bawahnya.
  - Tren pengeluaran 6 bulan sebagai bar sederhana: satu grafik EUR (indigo) dan satu IDR (kunyit), tanpa gradien.
  - Memakai `react-native-gifted-charts` yang sudah terpasang.
- **Backup** (`src/db/backup.ts`, `SettingsScreen.tsx`):
  - Export JSON (`{ schemaVersion, exportedAt, accounts, categories, transactions, transfers, fx_rates, budgets, recurring_rules }`) dan export CSV transaksi, dibagikan via `expo-file-system` + `expo-sharing`.
  - Import JSON: validasi versi dan bentuk data, konfirmasi, lalu ganti seluruh isi dalam satu transaksi DB.

### Langkah
1. `feat(db): central data-change event`.
2. `feat(widget): remaining budget per currency`.
3. `feat(widget): refresh on data change`.
4. `feat(nav): budgetapp://add deep link opens quick-add` + test parsing parameter.
5. `feat(widget): quick-add buttons per currency`.
6. `feat(reports): category breakdown and monthly trend queries` + test.
7. `feat: category donut and 6-month trend charts`.
8. `feat(backup): JSON export/import with validation` + test round-trip (export → import → isi identik).
9. `feat(backup): CSV export of transactions`.

**Kriteria selesai**
- Widget menampilkan angka yang sama dengan layar Budget/Dashboard, dan berubah dalam hitungan detik setelah transaksi disimpan.
  Tap "+ EUR" membuka quick-add dengan akun EUR terpilih. Dari app tertutup sampai tersimpan < 5 detik.
- `adb shell am start -d "budgetapp://add?account=999"` tidak crash (id tak dikenal diabaikan).
- Chart cocok dengan angka ringkasan untuk bulan yang sama.
- Test round-trip backup lolos. Secara manual: export → reset → import mengembalikan data utuh. File JSON yang rusak ditolak dengan pesan yang jelas.

---

## Fase 5: UX & aksesibilitas

Bagian visual (kontras, tema light/dark, splash) sudah dipindah ke Fase 1.5.

### File & fitur
- **Bahasa:** UI bahasa Indonesia. Semua string dipusatkan di `src/i18n/id.ts` dengan helper `t()` agar siap multi-bahasa (belum ada bahasa kedua).
- **Aksesibilitas:** `accessibilityRole`/`accessibilityLabel`/`accessibilityState` di semua `Pressable`/`Button`, termasuk keypad. Target sentuh minimal 48dp.
  Pakai `minHeight` alih-alih `height` tetap agar aman untuk font besar. `<Money>` dibacakan lengkap oleh screen reader (mis. "minus 12 euro 50 sen").
- **Form:** validasi inline via `Input.error` (Alert dihapus). `KeyboardAvoidingView` + `keyboardShouldPersistTaps="handled"`. Tombol Simpan nonaktif saat input belum valid.
- **State layar:** loading, kosong (dengan ajakan aksi), dan error (dengan tombol coba lagi). `ErrorBoundary` global, serta fallback jika `initDb` gagal.
- **Feedback:** Alert "Success" diganti toast/snackbar ringan. Hapus transaksi bisa di-undo selama beberapa detik.
- **Layout:** daftar/grid memakai `useWindowDimensions` (responsif untuk tablet).
- **Bersih-bersih:** tombol reset hanya untuk dev.

### Langkah
Satu commit per area: `feat(i18n)`, `feat(a11y): labels and roles`, `fix(a11y): touch targets and font scaling`, `feat(a11y): spoken amounts`,
`feat(forms): inline validation and keyboard handling`, `feat: loading/empty/error states`, `feat: error boundary and db init fallback`,
`feat: toast and undo delete`, `fix(layout): responsive widths`.

**Kriteria selesai**
- Navigasi seluruh app dengan TalkBack berjalan lancar: setiap kontrol punya label dan peran yang dibacakan, termasuk keypad.
- Dengan font sistem 200%, tidak ada teks terpotong di layar utama.
- Tidak ada `Alert.alert('Success'...)` dan tidak ada string UI campur bahasa.

---

## Fase 6: Backlog (belum dijadwalkan)

Ide dari riset yang dicatat, **bukan** komitmen. Setiap item dirinci dan disetujui terpisah sebelum dikerjakan (migrasi v4+).

- **Template/favorit + saran judul:** simpan kombinasi akun + kategori + nominal + catatan sebagai template, tampil di quick-add.
  Saran catatan dari riwayat (mis. "Carrefour", "Crous", "transfer ke orang tua").
- **Search + filter + tag:** pencarian teks catatan dan tag bebas (`#liburan`, `#kampus`) lewat tabel `tags` + `transaction_tags`.
- **Review bulanan:** layar ringkas setiap tanggal 1: total per mata uang, 3 kategori terbesar, budget tercapai/tidak, dan
  **biaya konversi bulan ini** = Σ (kurs ECB tanggal transfer − kurs implisit) × jumlah + fee eksplisit.
- **Pengingat harian opsional:** `expo-notifications`, jam bisa diatur, "Belum ada catatan hari ini", dengan aksi yang membuka quick-add.
- **Savings goals:** target per mata uang (mis. tiket pulang Jakarta, deposit apartemen) dengan progress bar.

---

## Keputusan (2026-10-31)

1. **Package id Android:** `com.daffarivaldi.budgetapp`, diganti di Fase 0. App akan terpasang sebagai aplikasi baru.
2. **Bahasa UI:** Indonesia. Struktur i18n disiapkan di Fase 5. Nama akun/kategori di seed berbahasa Indonesia.
3. **Total gabungan:** ditampilkan sebagai "≈" dalam **EUR** (default `base_currency`, bisa diganti di Pengaturan) memakai **kurs ECB dari tabel `fx_rates`**
   beserta tanggal kursnya, dan disembunyikan jika belum pernah ada kurs (Fase 2). *Menggantikan keputusan awal "kurs transfer terakhir" dalam IDR.*
4. **Currency:** cukup IDR dan EUR.
5. **Arah visual:** Opsi A "Buku Kas" dari [docs/RESEARCH.md](docs/RESEARCH.md), ikut light/dark sistem (Fase 1.5).

6. **Fee transfer:** dalam currency akun asal, di luar nominal kirim; masuk ringkasan bulanan sebagai "Biaya transfer", tidak masuk budget kategori.
7. **Kurs:** `fx_rates` hanya menyimpan EUR→IDR (`rate_micro`); IDR→EUR diturunkan saat dihitung. Semua konversi memakai BigInt.
8. **Widget tanpa budget:** menampilkan saldo per mata uang.

Revisi saat persetujuan pertama: `DROP TABLE` satu per satu; akun default dibuat oleh migrasi v1 (bukan oleh seed);
checklist Fase 1 mencakup cek `formatMoney` di Hermes.
Revisi saat persetujuan kedua (Fase 1.5–6): varian warna teks disetujui; `fx_rates` hanya base EUR; `base_currency` default EUR.
