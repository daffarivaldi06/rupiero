# BudgetApp — Rencana Overhaul

> Dasar: [BUDGETAPP_REPORT.md](BUDGETAPP_REPORT.md). Status: **disetujui 2026-10-31 dengan revisi** (lihat "Keputusan").
> Kondisi awal (2026-10-31): hanya branch `master`, tanpa remote, Node 22.18, `tsc --noEmit` = 1 error
> (`DashboardScreen.tsx:114`, tipe `style` di `Card`). Semua kode `src/` belum di-commit.

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
    migrations/              # 001_initial.ts, 002_transfers.ts, 003_budgets_recurring.ts, index.ts (runner)
    repos/                   # accounts, categories, transactions, transfers, budgets, recurring, reports
    seed.ts
    events.ts                # notifyDataChanged() → refresh widget & listener
  hooks/                     # useAccounts, useMonthSummary, useTransactions, ... (fetch + reload saat fokus/ada perubahan)
  components/                # Button, Card, Input, MoneyInput, AccountPicker, CategoryPicker, MonthSelector, BalanceCard, ...
  screens/
  navigation/                # types.ts (RootStackParamList), RootNavigator.tsx
  widget/
test/
  sqljs-db.ts                # adapter Db di atas sql.js (WASM, tanpa build native di Windows)
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

## Fase 2: Fitur inti

### Skema v2 (migrasi `002_transfers.ts`)

```sql
CREATE TABLE transfers (
  id                INTEGER PRIMARY KEY,
  from_account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  from_amount_minor INTEGER NOT NULL CHECK (from_amount_minor > 0),
  to_amount_minor   INTEGER NOT NULL CHECK (to_amount_minor > 0),  -- kurs aktual = rasio keduanya, tanpa float tersimpan
  date              TEXT    NOT NULL,
  month             TEXT    GENERATED ALWAYS AS (substr(date, 1, 7)) STORED,
  note              TEXT    NOT NULL DEFAULT '',
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (from_account_id <> to_account_id)
);
CREATE INDEX idx_transfer_from ON transfers(from_account_id, date);
CREATE INDEX idx_transfer_to   ON transfers(to_account_id, date);

-- buku besar terpadu untuk saldo & daftar transaksi
CREATE VIEW ledger AS
  SELECT 'tx' AS kind, id, account_id, category_id, date, month,
         CASE type WHEN 'income' THEN amount_minor ELSE -amount_minor END AS signed_minor, note
    FROM transactions
  UNION ALL SELECT 'transfer_out', id, from_account_id, NULL, date, month, -from_amount_minor, note FROM transfers
  UNION ALL SELECT 'transfer_in',  id, to_account_id,   NULL, date, month,  to_amount_minor,  note FROM transfers;
```

Transfer **bukan** income/expense, sehingga tidak ikut ringkasan pemasukan/pengeluaran, tapi memengaruhi saldo akun.

### Fitur & file
- **Saldo per akun:** Dashboard menampilkan kartu akun (saldo = `opening_balance_minor + SUM(ledger.signed_minor)`), ringkasan income/expense bulan terpilih **per currency**, dan grid kategori berisi total pengeluaran bulan ini.
- **Total gabungan "≈ perkiraan":** semua saldo dikonversi ke IDR memakai kurs implisit dari **transfer EUR↔IDR terakhir**, dengan label "≈ perkiraan, kurs dd/mm".
  Total ini disembunyikan jika belum ada transfer lintas currency.
  File: `DashboardScreen.tsx`, `components/{BalanceCard,AccountCard,MonthSelector}.tsx`, `repos/reports.ts`, `hooks/useMonthSummary.ts`.
- **Kelola akun:** `AccountsScreen.tsx` dan `AccountFormScreen.tsx` (tambah, ganti nama, arsip; currency terkunci jika akun sudah punya transaksi).
- **List transaksi:** `TransactionListScreen.tsx` memakai `FlatList` yang dikelompokkan per tanggal, dengan filter bulan/akun/kategori/tipe dan pagination (`LIMIT/OFFSET`). Transfer ikut tampil.
- **Edit/hapus:** `TransactionFormScreen.tsx` mendukung mode edit (`transactionId`) dan tombol Hapus dengan konfirmasi. Picker kategori memakai `CategoryPicker` (tanpa teks bebas, tersedia "+ Kategori baru").
- **Date picker:** `@react-native-community/datetimepicker` (`npx expo install`), default hari ini, disimpan sebagai tanggal lokal.
- **Transfer:** `TransferFormScreen.tsx`. Pengguna memilih akun asal dan tujuan, mengisi nominal kirim dan nominal terima, dan kurs live tampil (mis. "1 EUR = Rp 17.100").
  Jika currency sama, nominal terima otomatis sama dengan nominal kirim. Transfer bisa diedit dan dihapus. Repo: `repos/transfers.ts`.
- **Navigasi:** `src/navigation/{types,RootNavigator}.tsx` dengan params bertipe dan tanpa `any`.
  - Edit kategori: `goBack()`. Detail hanya menerima `categoryId` dan membaca nama dari DB saat fokus.
  - Hapus kategori/akun: `popTo('Dashboard')`.
  - Judul header dinamis (Tambah/Edit).
  - CategoryDetail menerima param `month` dari Dashboard.
- **Hapus kategori:** ditolak jika masih dipakai (FK RESTRICT). UI menawarkan "pindahkan transaksi ke kategori lain" atau "arsipkan".

### Langkah
1. `feat(db): add transfers table and ledger view (v2)` + test saldo dengan transfer lintas currency.
2. `feat(db): add transfer repo` + test (kurs implisit, larangan akun sama).
3. `refactor(nav): typed root navigator, remove any`.
4. `fix(nav): use goBack/popTo after category edit/delete` dan `fix(nav): dynamic header titles`.
5. `feat: accounts list and form`.
6. `feat: per-account balances on dashboard`.
7. `feat: transaction list with filters and pagination`.
8. `feat: edit and delete transactions` dan `feat: date picker in transaction form`.
9. `feat: transfer between accounts with actual rate`.
10. `feat: reassign or archive category on delete`.

**Kriteria selesai**
- Test: saldo akun benar setelah income, expense, transfer EUR→IDR, edit, dan hapus. Transfer tidak memengaruhi total income/expense.
- Manual:
  - Transfer €200,00 → Rp 3.420.000 membuat saldo EUR turun €200, saldo IDR naik Rp 3.420.000, dan kurs tampil "1 EUR = Rp 17.100".
  - Edit dan hapus transaksi dari list berfungsi.
  - Tanggal bisa diatur mundur, dan transaksinya muncul di bulan yang benar.
  - Setelah rename/hapus kategori, tombol back tidak membuka layar usang atau form.
- `grep -rn "useRoute<any>\|useNavigation<any>" src` kosong.

---

## Fase 3: Budget per kategori/bulan + recurring rules

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
  Domain: `src/domain/budget.ts` (status, persentase). Repo: `repos/budgets.ts`.
- **Recurring:**
  - `src/domain/recurrence.ts` berisi `occurrences(rule, fromDate, toDate)`. Tanggal 29–31 dijepit ke akhir bulan, dan aturan `paused`/`end_date` dihormati.
  - `repos/recurring.ts` berisi `materializeDue(today)`: membuat transaksi yang jatuh tempo sampai **hari ini** (bukan masa depan). Fungsi ini idempoten berkat unique index, dan dipanggil saat app start, saat app kembali ke foreground (`AppState`), dan dari widget.
  - `RecurringListScreen.tsx` (daftar aturan; pause/lanjut/stop/hapus) dan `RecurringFormScreen.tsx`. Di TransactionForm ada toggle "Ulangi" yang membuat aturan beserta kemunculan pertamanya.
  - Mengedit aturan hanya berlaku untuk kemunculan berikutnya. Transaksi yang sudah dibuat tetap ada dan bisa diedit satu per satu.

### Langkah
1. `feat(db): add budgets and recurring_rules (v3)` + test migrasi v2→v3.
2. `feat(domain): recurrence occurrences with tests` (akhir bulan, tahun kabisat, weekly/yearly, interval, pause, end).
3. `feat(db): idempotent recurring materialization` + test (dua kali jalan, hasilnya tetap sama).
4. `feat(domain): budget status with tests`.
5. `feat: budget screen with copy-from-previous-month`.
6. `feat: budget progress on dashboard and category detail`.
7. `feat: recurring rules list and form` dan `feat: repeat toggle in transaction form`.
8. `feat: materialize recurring on start and foreground`.

**Kriteria selesai**
- Test: aturan bulanan tanggal 31 menghasilkan 28/29 Feb, 30 Apr, dst. Materialisasi ganda tidak membuat duplikat. Aturan yang di-stop tidak menghasilkan transaksi baru.
- Manual: set budget Makanan €300 lalu catat €250, progress tampil 83% dengan warna peringatan. "Salin dari bulan lalu" berfungsi.
  Aturan sewa bulanan muncul sekali per bulan dan berhenti setelah di-stop.
- Total widget/Dashboard/list konsisten (recurring sekarang berupa transaksi nyata, bukan hitungan semu).

---

## Fase 4: Widget, chart, backup

### File & fitur
- **Widget** (`src/widget/*`, `src/db/events.ts`, `app.json`):
  - Widget menampilkan saldo per akun (maksimal 3) dan pengeluaran bulan ini per currency, diformat via `money.ts`. Warna diambil dari `theme/colors.ts`.
  - Handler membuka DB lewat `initDb` yang sama (PRAGMA, migrasi) dan menjalankan `materializeDue`.
  - `notifyDataChanged()` dipanggil di setiap mutasi repo, lalu memicu `requestWidgetUpdate`.
  - `clickAction`: tap widget membuka app, tombol "+" membuka deep link `budgetapp://transaction/new` (`scheme` di `app.json`, `linking` di navigator).
- **Chart** (`DashboardScreen.tsx` atau `InsightsScreen.tsx` baru, `repos/reports.ts`):
  - Donut pengeluaran per kategori untuk bulan terpilih (per currency).
  - Bar income vs expense selama 6 bulan terakhir (per currency).
  - Memakai `react-native-gifted-charts` yang sudah terpasang. `pieData` lama yang mati dihapus.
- **Backup** (`src/db/backup.ts`, `SettingsScreen.tsx`):
  - Export JSON (`{ schemaVersion, exportedAt, accounts, categories, transactions, transfers, budgets, recurring_rules }`) dan export CSV transaksi, dibagikan via `expo-file-system` + `expo-sharing`.
  - Import JSON: validasi versi dan bentuk data, konfirmasi, lalu ganti seluruh isi dalam satu transaksi DB.

### Langkah
1. `feat(db): central data-change event`.
2. `fix(widget): per-account balances with correct currency`.
3. `feat(widget): refresh on data change`.
4. `feat(widget): open app and quick-add deep link`.
5. `feat(reports): category breakdown and monthly trend queries` + test.
6. `feat: category donut and 6-month trend charts`.
7. `feat(backup): JSON export/import with validation` + test round-trip (export → import → isi identik).
8. `feat(backup): CSV export of transactions`.

**Kriteria selesai**
- Widget menampilkan simbol dan angka yang sama dengan Dashboard, dan berubah dalam hitungan detik setelah transaksi disimpan. Tap "+" membuka form tambah.
- Chart cocok dengan angka ringkasan untuk bulan yang sama.
- Test round-trip backup lolos. Secara manual: export → reset → import mengembalikan data utuh. File JSON yang rusak ditolak dengan pesan yang jelas.

---

## Fase 5: UX & aksesibilitas

### File & fitur
- **Bahasa:** UI bahasa Indonesia. Semua string dipusatkan di `src/i18n/id.ts` dengan helper `t()` agar siap multi-bahasa (belum ada bahasa kedua).
- **Aksesibilitas:** `accessibilityRole`/`accessibilityLabel`/`accessibilityState` di semua `Pressable`/`Button`. Target sentuh minimal 48dp.
  Pakai `minHeight` alih-alih `height` tetap agar aman untuk font besar. Kontras teks minimal 4.5:1 (ganti `danger`, cek semua pasangan warna di `colors.ts`).
  Saldo dibacakan lengkap oleh screen reader.
- **Form:** validasi inline via `Input.error` (Alert dihapus). `KeyboardAvoidingView` + `keyboardShouldPersistTaps="handled"`. Tombol Simpan nonaktif saat input belum valid.
- **State layar:** loading, kosong (dengan ajakan aksi), dan error (dengan tombol coba lagi). `ErrorBoundary` global, serta fallback jika `initDb` gagal.
- **Feedback:** Alert "Success" diganti toast/snackbar ringan. Hapus transaksi bisa di-undo selama beberapa detik.
- **Tampilan:** `userInterfaceStyle: "dark"`, splash/adaptive icon berlatar gelap (`app.json`). Grid kategori memakai `useWindowDimensions` (responsif untuk tablet). Ikon/warna kategori opsional.
- **Bersih-bersih:** hapus teks "for testing purposes". Tombol reset hanya untuk dev.

### Langkah
Satu commit per area: `feat(i18n)`, `feat(a11y): labels and roles`, `fix(a11y): touch targets and font scaling`, `fix(theme): contrast`,
`feat(forms): inline validation and keyboard handling`, `feat: loading/empty/error states`, `feat: error boundary and db init fallback`,
`feat: toast and undo delete`, `chore(app): dark ui style and splash`.

**Kriteria selesai**
- Navigasi seluruh app dengan TalkBack berjalan lancar: setiap kontrol punya label dan peran yang dibacakan.
- Dengan font sistem 200%, tidak ada teks terpotong di layar utama.
- Semua pasangan warna teks/latar ≥ 4.5:1 (dicek dengan skrip kecil di test).
- Tidak ada `Alert.alert('Success'...)` dan tidak ada string UI campur bahasa.

---

## Keputusan (2026-10-31)

1. **Package id Android:** `com.daffarivaldi.budgetapp`, diganti di Fase 0. App akan terpasang sebagai aplikasi baru.
2. **Bahasa UI:** Indonesia. Struktur i18n disiapkan di Fase 5. Nama akun/kategori di seed berbahasa Indonesia.
3. **Total gabungan:** ditampilkan sebagai "≈ perkiraan" memakai kurs transfer terakhir, dan disembunyikan jika belum ada transfer (Fase 2).
4. **Currency:** cukup IDR dan EUR.

Revisi saat persetujuan: `DROP TABLE` satu per satu; akun default dibuat oleh migrasi v1 (bukan oleh seed);
checklist Fase 1 mencakup cek `formatMoney` di Hermes.
