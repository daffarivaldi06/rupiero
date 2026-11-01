# BudgetApp — Overhaul Plan

> Basis: [BUDGETAPP_REPORT.md](BUDGETAPP_REPORT.md). Status: **approved 2026-10-31 with revisions** (see "Decisions").
> Starting state (2026-10-31): only the `master` branch, no remote, Node 22.18, `tsc --noEmit` = 1 error
> (`DashboardScreen.tsx:114`, `style` type in `Card`). None of the `src/` code is committed yet.

## Progress

| Phase | Status | Notes |
|---|---|---|
| 0 | ✅ done (tag `phase-0-done`) | Android debug build with the new package id succeeds |
| 1 | ✅ done (tag `phase-1-done`) | Manual device test passed (2026-10-31) |
| 1.5 | ✅ done (tag `phase-1.5-done`) | Approved together with the Phase 1.6 review (2026-10-31) |
| 1.6 | ✅ done (tag `phase-1.6-done`) | Screenshot review + 5 fixes (2026-10-31): balance count-up, ledger-style category detail, summary without minus signs, daily subtotal only when >1 transaction, larger adaptive icon |
| 2 | ✅ done (tag `phase-2-done`) | Phone test passed (2026-10-31) |
| 2.1 | ✅ done (tag `phase-2.1-done`) | Phone test passed (2026-10-31) |
| 3 | ✅ done (tag `phase-3-done`) | Phone test passed (2026-10-31) |
| 4 | ✅ done (tag `phase-4-done`) | Phone test passed (2026-10-31), plus widget revisions (budget bar, warning color, 3×2 size). First release build 1.0.0 (versionCode 1), see [docs/RELEASE.md](docs/RELEASE.md) |
| 5 | ✅ done (tag `phase-5-done`) | Phone test of 1.0.2 passed (2026-11-01), including the keyboard in forms.  id/en languages, light/dark theme, default categories, themed date picker, a11y, inline validation, toast + undo. Release 1.0.2 (versionCode 3; 1.0.1 was pulled because of a keyboard bug in forms) |
| 6 | backlog | Not scheduled yet; each item needs its own approval |

Deviations from the plan (Phase 0–1):
- The test adapter uses the **asm.js** build of sql.js. The WASM build fails in the Jest VM sandbox (`sqlite3_open` → "out of memory"), even though it works in plain Node.
- `expo install -- --save-dev` ignores the flag; `eslint-config-expo` and the Jest packages were moved to `devDependencies` by hand.
- `parseAmount` rule: exactly 3 digits after the last separator are read as thousands, so EUR "12,505" = €12.505,00 (consistent with "1.234"). `MoneyInput` reformats on blur, so the user immediately sees how it was interpreted.
- The Phase 2 criterion "no `useRoute<any>`/`useNavigation<any>`" was already met in Phase 1.

Deviations from the plan (Phase 1.5):
- **IBM Plex Sans has no OpenType `tnum` feature**, but all its default digits already have the same width (600 units; checked with fontTools).
  Figures are already tabular without that feature. `fontVariant: ['tabular-nums']` is still set as a safeguard in case the font is replaced.
- Extra token `onIdr` (dark text on an IDR fill): dark-mode `ink` on `#E0A93A` is only 1.73:1. `lineStrong` = `#857E70` (light) / `#6B7380` (dark).
- `Button` gets an `income` variant. `primary` is now an ink (`ink`) fill, not green.
- The widget is not restyled yet (still the old dark colors); scheduled together with the widget rework in Phase 4.

Deviations from the plan (Phase 1.6):
- The native splash is hidden as soon as the overlay (same logo, same position) has finished layout, **not** after the Dashboard data is ready.
  Holding the splash longer blocks the app's first frame, and if it exceeds Android's splash hand-off timeout, the system shows a black window
  (seen in debug builds that load the bundle from Metro). The stamp still only starts once the data is ready.
- Local plugin `plugins/with-night-window-background.js`: the Android window background follows the `bg` token in light **and** dark (expo-system-ui only handles light).
- `tsconfig.json`: `allowImportingTsExtensions` + `noEmit`, so that `scripts/render-brand-assets.ts` can be run directly by Node 22.18 and is still typechecked.
- The month summary on the Dashboard became a small "Cash flow {month}" table (`MonthFlow`); `MonthSummaryCard` is still used in category detail.
- The minus sign is still the ASCII hyphen from `formatMoneyParts` (not yet changed to "−").
- Review outcome: the balance figures **count up from 0** (never overshooting the target, landing exactly at the end) instead of odometer digits;
  category detail uses the category name as the header title and a ruled summary without a card ("Spending in October € 178,70",
  zero rows hidden); daily subtotal only when that day has >1 transaction; adaptive icon ~24% larger with more rounded frame corners
  (radius 18) so it stays inside the safe circle, thicker €/Rp bars.

Deviations from the plan (Phase 2):
- Steps 7–9 (sheet, rate preview, last account, edit/delete) went into one commit because they are intertwined; the keypad & category chips are in that commit too.
- ECB rates are fetched from `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=IDR` (the old domain `api.frankfurter.app` now 301-redirects there).
  `FxProvider` keeps the latest rate in context; sync at most once a day (setting `fx_checked_on`), on start and when the app returns to the foreground.
- The quick-add preview and the "≈" total use the **latest** ECB rate (its date is shown), not the rate on the transaction date. The transfer form compares against the ECB rate **on the transfer date**.
- Balances on the Dashboard (hero and account list) are computed up to the end of the selected month; the "≈" total sums those balances.
- Deleting a category that is still in use: choose "Move…" (`CategoryReassign` screen) or "Archive". Archived categories cannot be restored from the UI yet (backlog).
- `MoneyInput` and `TransactionFormScreen` were removed; amounts are entered only via the quick-add keypad. The account/transfer forms use plain text inputs + `parseAmount`.
- The Android date picker still uses the system default style (teal), not the theme tokens yet.

Deviations from the plan (Phase 2.1 & 3):
- When balances are hidden, the income/expense colors are neutralised too (red/green would still leak the direction). Budget percentages stay visible.
- Quick-add: the Android back button now closes the sheet (it used to close the app; found during Phase 3 testing).
- `DataProvider` replaces the quick-add revision: one data revision for all screens, and it is the one that runs
  `materializeDue` on start and when the app returns to the foreground. The widget also runs it before reading balances.
- "Next" (`nextDueDate`) skips an occurrence that has already been recorded today (using `last_generated_date`).
- "Stop" on a rule that has not started yet = paused (because `end_date` may not be before `start_date`).
- Budget actual = category expenses only; income/refunds in that category do not reduce it. The Dashboard only shows budgets ≥ 80%;
  the Budget screen can be opened from the Dashboard and Settings.
- The "Repeat" toggle in quick-add uses interval 1; other intervals go through the Recurring transactions form.
- Dev note: the Metro file watcher on this machine often misses changes; rerun `npx expo start --clear` if the UI does not change.

Deviations from the plan (Phase 4):
- Main deep link `rupiero://add?account=<id>&category=<id>`; `budgetapp://` (the name in the plan) is still accepted. Handled in `QuickAddProvider`
  (not the navigator's `linking`) because the target is a sheet, not a screen.
- **One database connection per process** (`src/db/DatabaseProvider.tsx`, replacing `SQLiteProvider`). The widget task runs in the app's JS runtime;
  expo-sqlite shares the native connection per file name, so closing a second connection also releases the app's connection (queries fail with "released shared object").
  `busy_timeout` is set first.
- Plugin `plugins/with-latest-intent.js`: `MainActivity.onNewIntent` calls `setIntent`, so that a widget tap that restarts a dead process
  still opens quick-add.
- Charts are drawn by hand with `react-native-svg` (`DonutChart`, `TrendBars`) on a new **Charts** screen; `react-native-gifted-charts` was removed
  (its bar chart needs a native gradient module). Legends and tables use shades of the currency colors (`eur` / `idrText`), not a multicolor palette.
- Spending in the charts = transaction expenses + transfer fees (same as the monthly summary); transfer fees show as "Transfer fee".
- JSON backup: `format: "rupiero-backup"`; import only accepts a `schemaVersion` equal to the app's (other versions are rejected with a message).
  Device settings (`settings`) are not exported/replaced. The file is picked via `expo-document-picker` (new dependency).
- CSV: one row per movement (transaction, transfer out/in, fee), decimal amounts with a dot, UTF-8 BOM for Excel.
- Widget: label "Budget left" per currency that has a budget this month, otherwise "Balance"; the light/dark appearance follows the system.

## Working principles

- **Small commit per step**, Conventional Commits format (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`),
  without AI attribution or a `Co-Authored-By` trailer. Every commit must pass `npm run typecheck` and `npm test`.
- Work on the `overhaul` branch (from `master`). Each phase is closed with a `phase-N-done` tag.
- **Old data is not migrated.** `budget.db` only holds test data. The schema is recreated from scratch as `user_version = 1`.
- Pure logic (money, dates, recurrence, budget) lives in `src/domain/` and must be tested. SQL lives in `src/db/` and is tested through the `sql.js` adapter.
- UI verification is done manually on Android (`npx expo run:android`) with a checklist per phase. I will write the test steps. Device testing is done by you.

## Target architecture (brief)

```
src/
  config/dev.ts              # flag dev (seed, tombol reset)
  domain/                    # pure, no RN/SQLite: money, dates, recurrence, budget, types
  db/
    client.ts                # interface Db minimal (runAsync/getAllAsync/getFirstAsync/execAsync)
    init.ts                  # PRAGMA + migrate + seed
    migrations/              # 001_initial.ts, 002_transfers_fx.ts, 003_budgets_recurring.ts, index.ts (runner)
    repos/                   # accounts, categories, transactions, transfers, fxRates, budgets, recurring, reports
    seed.ts
    events.ts                # notifyDataChanged() → refresh widget & listener
  fx/                        # frankfurter.ts (fetch ECB rates), sync.ts (daily cache + fallback)
  theme/                     # tokens.ts (light/dark), typography.ts, ThemeProvider.tsx (useTheme)
  hooks/                     # useAccounts, useMonthSummary, useTransactions, ... (fetch + reload on focus/changes)
  components/                # Txt, Money, Ledger*, Keypad, QuickAddSheet, Button, Input, MoneyInput, AccountPicker, ...
  screens/
  navigation/                # types.ts (RootStackParamList), RootNavigator.tsx
  widget/
test/
  sqljs-db.ts                # Db adapter on top of sql.js (asm.js build, no native build on Windows)
```

---

## Phase 0: Secure the repo

**Files:** `.gitignore`, `package.json`, `eslint.config.js`, `src/components/{Card,Button}.tsx`, `app.json`.

**Steps**
1. Add `.idea/` to `.gitignore`.
2. Commit the baseline as is: `chore: commit existing app source as baseline` (contents: `src/`, `App.tsx`, `app.json`, `index.ts`, `package*.json`, `BUDGETAPP_REPORT.md`, `PLAN.md`). Then create the `baseline` tag.
3. Create the `overhaul` branch.
4. Add a `typecheck` script (`tsc --noEmit`). Fix the one baseline error: `Card.style` becomes `StyleProp<ViewStyle>`, and the same for `Button`.
5. Set up ESLint via `npx expo lint` (Expo's default config) and a `lint` script. Only fix unused imports, no refactoring.
6. Remove the dependency that is definitely unused: `expo-linear-gradient`. `expo-file-system` and `expo-sharing` are kept for Phase 4.
7. Change `android.package` from `com.anonymous.BudgetApp` to `com.daffarivaldi.budgetapp`, then rerun prebuild (`npx expo prebuild --clean -p android`).

**Done criteria**
- `git status` is clean. The `baseline` tag points to the old code.
- `npm run typecheck` and `npm run lint` pass without errors.
- The app still runs as before on Android.

---

## Phase 1: Data foundation

### Schema v1 (created from scratch)

```sql
-- outside a transaction, every time the DB is opened (app & widget):
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE accounts (
  id                    INTEGER PRIMARY KEY,
  name                  TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  currency              TEXT    NOT NULL CHECK (currency IN ('IDR','EUR')),  -- one currency per account, cannot change once it has transactions
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
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),   -- EUR = cents, IDR = rupiah
  date         TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'), -- LOCAL date 'YYYY-MM-DD'
  month        TEXT    GENERATED ALWAYS AS (substr(date, 1, 7)) STORED,                        -- 'YYYY-MM'
  note         TEXT    NOT NULL DEFAULT '',
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tx_account_date   ON transactions(account_id, date);
CREATE INDEX idx_tx_month_category ON transactions(month, category_id);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- key-value, e.g. 'default_account_id'
```

Notes:
- `month` as a *generated column* guarantees consistency with `date`. The SQLite bundled with expo-sqlite supports it (≥ 3.31).
  If it turns out to be a problem on the device, fall back to a regular column filled in by the repo.
- There is no longer a "global rate" for computing balances. Balances are always computed in the account's currency. Rates only come from transfers (Phase 2).

### Migrations & legacy DB detection

`src/db/migrations/index.ts`:
- A list of migrations `[{ version: 1, up }, ...]`. The runner reads `PRAGMA user_version`, then runs each `up`
  not yet applied inside `withExclusiveTransactionAsync`, followed by `PRAGMA user_version = N`.
- **Legacy DB:** if `user_version = 0` and old tables exist, drop them **one by one** (SQLite does not support
  multiple tables in one `DROP`): `DROP TABLE IF EXISTS transactions;`, `DROP TABLE IF EXISTS categories;`, `DROP TABLE IF EXISTS settings;`.
  Then apply v1, all in one transaction. If `user_version = 0` without tables: fresh install, straight to v1.
- If `user_version` is higher than the version the app knows (downgrade): throw a clear error, without touching the data.
- **Default accounts:** migration v1 creates `Rekening EUR` (EUR) and `Rekening IDR` (IDR) if the `accounts` table is empty,
  **regardless of the seed flag**. Both have an opening balance of 0.

### Sample seed data

- `src/config/dev.ts`: `export const SEED_SAMPLE_DATA = __DEV__ && process.env.EXPO_PUBLIC_SEED_SAMPLE_DATA !== 'false'`.
  The seed is on by default in dev, can be turned off with `EXPO_PUBLIC_SEED_SAMPLE_DATA=false` in `.env.local`, and **never** runs in release builds.
- The seed **only adds sample data**; it does not recreate the default accounts. The seed runs only once, marked via `settings.sample_data_seeded = '1'`,
  so that the sample data does not come back after all transactions are deleted.
- Seed contents (deterministic, relative to the current month, covering the last 3 months, no future dates):
  - Extra account: `Dompet Tunai` (IDR, opening balance Rp 750.000). Other transactions use the two default accounts.
  - Categories: Salary, Rent, Food & Groceries, Transport, Bills, Entertainment, Health, Other.
  - About 40 transactions, for example: salary €1.850,00/month, rent €650,00, groceries €23,45 / €61,80, ticket €2,90,
    meal Rp 35.000, ojek (motorbike taxi) Rp 18.500, phone credit Rp 100.000, electricity Rp 450.000. EUR amounts deliberately use cents to test rounding.
- In Settings, a **"Reset & add sample data"** button is shown only when `__DEV__`.

### `src/domain/money.ts` + test

- `CurrencyCode = 'IDR' | 'EUR'`, and `CURRENCIES: Record<CurrencyCode, { symbol, minorDigits, locale }>` (IDR: 0 digits, `id-ID`; EUR: 2 digits).
- `parseAmount(text, currency): number | null`: string to integer minor units. Accepts `12,50`, `12.50`, `1.234,56`, and `1234`.
  For IDR, every `.`/`,` is treated as a thousands separator. The function rejects negative values, empty input, more decimals than `minorDigits`, and values above `Number.MAX_SAFE_INTEGER`.
- `formatMoney(minor, currency, { sign? })` formats **manually and deterministically** (dot for thousands, comma for decimals, symbol in front:
  "Rp 12.500", "€ 12,50"), without `Intl`, because `Intl` on Hermes can differ from Node. The output is still checked on the device (checklist).
- `formatInputValue(minor, currency)` is used to refill the input in edit mode.
- `impliedRate(fromMinor, fromCcy, toMinor, toCcy)` and `convertMinor(minor, rate)`, with half-up rounding using integer arithmetic.
- `src/domain/dates.ts`: `todayLocal()`, `monthOf(date)`, `addMonths(month, n)`, `monthRange`, `formatMonthLabel`. All based on local dates, without `toISOString()`.
- Tests: `src/domain/__tests__/money.test.ts`, `dates.test.ts` (including month boundaries, February, and year changes).

### Files changed/created

- **New:** `src/config/dev.ts`, `src/domain/{money,dates,types}.ts` + tests, `src/db/{client,init,seed,events}.ts`,
  `src/db/migrations/{index,001_initial}.ts`, `src/db/repos/{accounts,categories,transactions,reports,settings}.ts`,
  `src/components/MoneyInput.tsx`, `src/components/AccountPicker.tsx`, `test/sqljs-db.ts`, `jest.config.js`.
- **Changed:** `App.tsx` (`onInit={initDb}` from `src/db/init.ts`), `TransactionFormScreen.tsx` (pick an account instead of a currency, `MoneyInput`, `category_id`),
  `DashboardScreen.tsx` and `CategoryDetailScreen.tsx` (totals grouped per currency, temporary), `SettingsScreen.tsx` (remove rate/display currency, add dev reset),
  `Widget.tsx` + `widget-task-handler.tsx` (minimal adaptation: balance per account).
- All touched screens use **Indonesian text** directly (per Decision #2). Extraction to `src/i18n/` stays in Phase 5.
- The old `recurring` flag is removed in Phase 1 and comes back as recurring rules in Phase 3.
- **Removed:** `src/db/database.ts`.

### Steps (one commit per item)
1. `chore: set up jest-expo` (`npx expo install jest-expo jest @types/jest -- --save-dev`, `test` script, one smoke test).
2. `feat(domain): add money parsing/formatting with tests`.
3. `feat(domain): add local date helpers with tests`.
4. `test: add sql.js Db adapter` + `feat(db): add Db client interface`.
5. `feat(db): add migration runner with legacy reset` + test (empty DB → v1; legacy DB → drop + v1; higher version → error).
6. `feat(db): add schema v1` + constraint test (FK RESTRICT, CHECK amount > 0, generated `month`).
7. `feat(db): enable WAL and foreign keys on open`.
8. `feat(db): add accounts/categories/transactions repos` + test for the balance query and the monthly summary per currency.
9. `feat(db): add dev seed data behind flag` + idempotency test (the seed does not run twice).
10. `feat(ui): add MoneyInput with per-currency decimals`.
11. `refactor: switch screens to new repos` + `refactor: remove legacy database.ts`.

**Done criteria**
- `npm test` passes: money, dates, migrations (3 scenarios), constraints, repos, seed.
- Install over a legacy DB: the app does not crash, `PRAGMA user_version = 1`, and the seed data appears.
- With the seed turned off: only the two default accounts exist and there are no transactions.
- **Device check (Hermes):** `formatMoney` for EUR and IDR displays exactly the same as the Node test output
  (e.g. "€ 1.234,56", "Rp 1.250.000", negative sign, zero).
- Input `€12,50` is stored as `amount_minor = 1250` and displayed as "€12,50".
- A transaction created at 00:30 local time on the 1st lands in the correct month.
- `grep -r "amount REAL\|toISOString" src` is empty (except in tests). `database.ts` no longer exists.

---

## Phase 1.5: "Buku Kas" design system

Goal: all new screens in Phase 2+ use this style from the start ("Buku Kas" is Indonesian for 'cash ledger'). The visual direction follows Option A in [docs/RESEARCH.md](docs/RESEARCH.md):
warm paper / charcoal ink, tabular figures as the main element, color only for meaning (EUR, IDR, expense, income).
The visual part of Phase 5 (contrast, theme, splash) is moved here.

### Color tokens (follow system light/dark)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `bg` | `#F4F1EA` | `#16181D` | screen background |
| `surface` | `#FBFAF6` | `#1F232A` | sheet, balance card, input |
| `ink` | `#1C1B19` | `#ECE8DF` | primary text |
| `inkMuted` | `#5F5B53`* | `#A39E93`* | secondary text, labels |
| `line` | `#D9D4C7` | `#323843`* | ledger lines (decorative) |
| `eur` | `#2E4A8B` | `#9DB2EA`* | EUR mark/text |
| `idr` | `#C98A0B` | `#E0A93A`* | IDR mark/fill (text on top uses `ink`) |
| `idrText` | `#8A5D00`* | `#E0A93A`* | IDR text on `bg`/`surface` |
| `expense` | `#B23A2E` | `#E8877B`* | expense |
| `income` | `#2F7D4F` | `#6FC08F`* | income (fill, text on `surface`) |
| `incomeText` | `#2A7047`* | `#6FC08F`* | income text on `bg` |

\* = my proposal, not from the research. All text/background combinations above have been computed at ≥ 4.5:1 (AA).
**Research values that fail AA as text** and were therefore given variants:
- light: IDR `#C98A0B` on `bg` = 2.61:1; income `#2F7D4F` on `bg` = 4.47:1.
- dark: EUR `#2E4A8B` = 2.09:1, expense `#B23A2E` = 2.99:1, income `#2F7D4F` = 3.52:1 on `#16181D`.

The `line` color is deliberately faint (decorative, around 1.3–1.5:1). Borders of interactive components (input, chip) use `lineStrong` ≥ 3:1 (WCAG 1.4.11), determined and tested during implementation.

### Typography & figures
- **IBM Plex Sans** (400/500/600/700) for UI and figures, **IBM Plex Mono** (500) for small currency codes (`EUR`, `IDR`).
  Fonts are embedded via the `expo-font` config plugin (packages `@expo-google-fonts/ibm-plex-sans` and `/ibm-plex-mono`), so there is no loading/flash on start.
  On Android, `fontWeight` is unreliable for custom fonts, so the `<Txt>` component maps weights to font file names.
- **`<Money>`**: renders `formatMoneyParts()` (sign, symbol, digits) with `fontVariant: ['tabular-nums']`, display/title/body/caption sizes, automatic color
  (income/expense/neutral) or currency color. The `tnum` feature **must be tested on the device** (see criteria).

### Composition
- The transaction list consists of **ruled ledger-style rows** (thin lines, no cards), grouped by date with a daily subtotal per currency.
- Cards only for 1–2 key elements (balance card). Radius 4 px (input, chip) and 8 px (card, sheet). No shadows/elevation, gradients, glow, emoji,
  or initial-letter circles. The category card grid on the Dashboard becomes a list of rows.
- `app.json`: `userInterfaceStyle: "automatic"` (+ `expo-system-ui`), light/dark versions of the splash and the adaptive icon background.

### Files
- **New:** `src/theme/{tokens,typography}.ts`, `src/theme/ThemeProvider.tsx` (`useTheme()` via `useColorScheme`), `src/theme/__tests__/contrast.test.ts`,
  `src/components/{Txt,Money,LedgerSection,LedgerRow}.tsx`.
- **Changed:** `App.tsx` (provider, navigation theme from tokens, `StatusBar style="auto"`), `src/domain/money.ts` (`formatMoneyParts`), all components in `src/components/`,
  all screens, `app.json`, `package.json`.
- **Removed:** `src/theme/colors.ts`.

### Steps
1. `feat(theme): add light/dark semantic tokens with contrast test`.
2. `feat(theme): follow system color scheme` (ThemeProvider, navigation theme, status bar, `expo-system-ui`, `userInterfaceStyle: automatic`).
3. `chore: embed IBM Plex Sans and Plex Mono` + `feat(ui): add Txt typography component`.
4. `feat(domain): add formatMoneyParts` + test, then `feat(ui): add Money component with tabular figures`.
5. `feat(ui): add ledger section and row components`.
6. `refactor(ui): restyle primitives` (Button, Input, MoneyInput, AccountPicker, Card, MonthSummaryCard).
7. `refactor(ui): restyle screens` (Dashboard: category list; CategoryDetail: ledger; forms; Settings).
8. `chore(app): light/dark splash and adaptive icon background`.
9. `refactor: remove legacy colors module`.

**Done criteria**
- `contrast.test.ts` passes: every text token on `bg` and `surface` ≥ 4.5:1 in both modes, `lineStrong` ≥ 3:1.
- `grep -rn "colors\.\|#121212\|shadow\|elevation\|LinearGradient" src` is empty.
- Manual (device):
  - Switch the system theme light↔dark: the app follows without a restart, including the navigation header and the status bar.
  - Text uses IBM Plex (not Roboto). The `EUR`/`IDR` codes use Plex Mono.
  - **Tabular nums:** the amount column in the transaction list aligns per digit (e.g. "€ 1.111,11" and "€ 8.888,88" are the same width). If not, `tnum` is not active and must be fixed before moving on.
  - No shadows, gradients or emoji. The transaction list is ruled, without cards.
  - The splash does not "flash white" in dark mode.

---

## Phase 1.6: "Rupiero" identity

Goal: the app gets its own name, logo and opening screen before the Phase 2 features are stacked on top. Still in the Buku Kas style: ink on paper,
color only for meaning.

### Name
- Display name **Rupiero**: `app.json` `name` (becomes the Android `app_name`/launcher label) and the widget label.
- `slug`, the package id `com.daffarivaldi.budgetapp`, and the file name `budget.db` are **not** changed (changing the package id = a new app on the device).

### Logo
- An **"R"** monogram with two horizontal bars like those in the € sign, styled as a stamp on a ledger line.
  The top bar uses the `eur` token, the bottom bar `idrText`, the letter and frame use `ink`. Built from geometric shapes (not a font),
  so it is sharp at every size.
- Single source: `src/brand/mark.ts` (`buildMarkSvg(colors)`). Used by `<RupieroMark>` (react-native-svg) and by
  `scripts/render-brand-assets.ts` (resvg), which generates the PNGs: `icon.png`, `adaptive-icon.png` (+ `adaptive-icon-monochrome.png` for
  Android 13 themed icons), `splash-icon.png`, `splash-icon-dark.png`, `favicon.png`. The canonical SVGs are stored in `assets/brand/`.
- Header wordmark = logo + "Rupiero" (IBM Plex Sans Bold).

### Header & Dashboard
- The Dashboard uses a **custom header** (the default header is hidden): wordmark on the left, month picker, settings icon (SVG, not text).
  Other screens keep the default header with a back button.
- **EUR and IDR balances** as large figures (`hero` variant, 52 pt, shrinking automatically until they fit), making them the most dominant element.
  Directly on the background, without a bordered card, separated by a ledger line.
  Balance = opening balance + transactions up to the end of the selected month (current month = current balance). Repo: `getBalancesByCurrency(db, { asOf })`.
- The month summary (income/expense per currency) moves down to a small row below the balances.
- The category list shows this month's total per currency on the right (signed, income/expense color). Repo: `getCategoryMonthTotals(db, month)`.
- Category detail: the Income/Expense buttons become outlined. Transactions without a note show no placeholder text.

### Opening animation
- Static native splash (logo) → the logo is **"stamped"** (Reanimated 4: lift, press, ink imprint, ±600 ms) → **the balance figures roll**
  (digits spin and then stop from left to right; the text length stays fixed, so the layout does not shift). Total < 1 second.
- The native splash is hidden once the first Dashboard data is ready (with a fallback timeout), so there is no blank screen.
- System **"Reduce motion"** on → no stamp and no rolling; the splash disappears immediately and the figures show their final values.
- Only on cold start; changing the month does not replay the animation.

### Files
- **New:** `src/brand/{mark.ts,RupieroMark.tsx,Wordmark.tsx}`, `src/brand/__tests__/mark.test.ts`, `src/components/{SettingsIcon,BalanceHero,AppHeader}.tsx`,
  `src/components/rolling.ts` (+ test), `src/intro/IntroProvider.tsx`, `scripts/render-brand-assets.ts`, `assets/brand/*.svg`.
- **Changed:** `app.json`, `package.json` (react-native-reanimated, react-native-worklets, @resvg/resvg-js dev), `App.tsx`, `src/theme/typography.ts` (`hero`),
  `src/db/repos/{accounts,reports}.ts` (+ test), `src/screens/{DashboardScreen,CategoryDetailScreen}.tsx`, icon/splash assets.

### Steps
1. `chore(app): rename display name to Rupiero`.
2. `chore: add react-native-reanimated and worklets`.
3. `feat(brand): add Rupiero stamp mark` + `chore(brand): generate icon and splash assets from the mark`.
4. `feat(db): balances by currency as of a date` + `feat(db): category totals per month`.
5. `feat(ui): custom dashboard header with wordmark, month picker and settings icon`.
6. `feat(dashboard): hero balances on the page and category totals`.
7. `refactor(ui): outline actions and no placeholder note in category detail`.
8. `feat(app): stamp intro and rolling balances`.

**Done criteria**
- Typecheck, lint, and all tests pass (including the new tests for balances as of a date, category totals, `rolling`, and `buildMarkSvg`).
- Manual (device/emulator):
  - Launcher label "Rupiero"; the adaptive icon and the themed icon look right; the light/dark splash uses the logo.
  - The EUR/IDR balances are the largest element on the Dashboard, in both modes.
  - Cold start: splash → stamp → rolling figures, feels < 1 second. With "Remove animations" on: no animation.
- Light + dark screenshots sent for review.

---

## Phase 2: Core features

### Schema v2 (migration `002_transfers_fx.ts`)

```sql
CREATE TABLE transfers (
  id                INTEGER PRIMARY KEY,
  from_account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  from_amount_minor INTEGER NOT NULL CHECK (from_amount_minor > 0),
  to_amount_minor   INTEGER NOT NULL CHECK (to_amount_minor > 0),     -- actual rate = ratio of the two, no stored float
  fee_minor         INTEGER NOT NULL DEFAULT 0 CHECK (fee_minor >= 0), -- in the source account currency, on top of from_amount
  date              TEXT    NOT NULL,
  month             TEXT    GENERATED ALWAYS AS (substr(date, 1, 7)) STORED,
  note              TEXT    NOT NULL DEFAULT '',
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (from_account_id <> to_account_id)
);
CREATE INDEX idx_transfer_from ON transfers(from_account_id, date);
CREATE INDEX idx_transfer_to   ON transfers(to_account_id, date);

-- ECB reference rate (via Frankfurter), EUR→IDR only, one row per rate date.
-- The IDR→EUR rate is not stored; it is derived when needed (invertRate).
CREATE TABLE fx_rates (
  date       TEXT    NOT NULL,                                   -- ECB rate date, not the fetch date
  base       TEXT    NOT NULL DEFAULT 'EUR' CHECK (base = 'EUR'),
  quote      TEXT    NOT NULL DEFAULT 'IDR' CHECK (quote = 'IDR'),
  rate_micro INTEGER NOT NULL CHECK (rate_micro > 0),            -- 1 EUR = rate_micro / 1,000,000 IDR (no float)
  source     TEXT    NOT NULL DEFAULT 'ecb-frankfurter',
  fetched_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (date, base, quote)
);

-- unified ledger for balances & transaction lists
CREATE VIEW ledger AS
  SELECT 'tx' AS kind, id, account_id, category_id, date, month,
         CASE type WHEN 'income' THEN amount_minor ELSE -amount_minor END AS signed_minor, note
    FROM transactions
  UNION ALL SELECT 'transfer_out', id, from_account_id, NULL, date, month, -from_amount_minor, note FROM transfers
  UNION ALL SELECT 'transfer_in',  id, to_account_id,   NULL, date, month,  to_amount_minor,  note FROM transfers
  UNION ALL SELECT 'transfer_fee', id, from_account_id, NULL, date, month, -fee_minor,         note FROM transfers WHERE fee_minor > 0;
```

- Transfer amounts are **not** income/expense, so they are not included in the income/expense summary, but they do affect account balances.
- **Transfer fees count as expenses** labelled "Transfer fee" in the monthly summary (the money really is gone), but do not count toward category budgets.
- New settings (`settings` table): `last_account_id` (quick-add default), `base_currency` (currency of the combined total, default `EUR`).

**Conversion without overflow and without loss of precision** (`src/domain/fx.ts` + `money.ts`):
- An `fx_rates` row is turned into `ExchangeRate { from: 'EUR', to: 'IDR', fromMinor: 100 × 1.000.000, toMinor: rate_micro }` (both integers).
  IDR→EUR = `invertRate()` of the same rate, never stored.
- All conversion multiplication/division uses **BigInt** (`convertMinor`), with **one** half-up rounding at the end.
  The final result must be safe as a `number` (`Number.isSafeInteger`); if not, throw a `RangeError` instead of returning a wrong number.
- Required tests (ECB rate of 30 Oct 2026: 1 EUR = 20.275,17 IDR, `rate_micro = 20275170000`):
  - €100.000,00 → **Rp 2.027.517.000** (intermediate result 2.0 × 10¹⁷ > `MAX_SAFE_INTEGER`).
  - Rp 10.000.000.000 → **€ 493.214,11** (intermediate result 10¹⁸).
  - Precision: €9.007.199.261,76 → **Rp 182.622.496.256.058** (float arithmetic gives …059).
  - The half-up rounding boundary exactly at ,5, symmetric negative values, and results outside the safe range rejected.
  - The derived IDR→EUR rate is consistent: a round-trip conversion differs by at most 1 minor unit due to rounding.

### Features & files
- **Balance per account:** the Dashboard shows two large balances per currency (sum of EUR accounts, sum of IDR accounts) with `<Money>`, the account list, and the income/expense summary
  for the selected month per currency. The category list shows this month's total spending.
  Files: `DashboardScreen.tsx`, `components/{BalanceHeader,AccountRow,MonthSelector}.tsx`, `repos/reports.ts`, `hooks/useMonthSummary.ts`.
- **ECB rates (`fx_rates`):** `src/fx/frankfurter.ts` fetches the latest EUR→IDR rate (Frankfurter endpoint verified during implementation, 5-second timeout).
  `src/fx/sync.ts` fetches at most once a day on app start/foreground if the stored rate is older than today. When offline, it fails silently and uses the last rate.
  `repos/fxRates.ts` (store/get the latest per date), `domain/fx.ts` (convert `rate_micro` to `ExchangeRate`, derive IDR→EUR).
- **Combined "≈" total:** all balances are converted to `base_currency` (default EUR) using the latest ECB rate, shown as a small row
  "≈ € 2.957,57 total · ECB rate 30 Oct" (sample data). This total is hidden if no rate has ever been stored.
- **Quick-add bottom sheet** (replaces `TransactionFormScreen` for adding **and** editing):
  - `@gorhom/bottom-sheet` v5 with `react-native-reanimated` 4 + `react-native-worklets` (plugin `react-native-worklets/plugin` in `babel.config.js` if the preset does not add it already),
    `react-native-gesture-handler` (`GestureHandlerRootView` + `BottomSheetModalProvider` in `App.tsx`). All installed via `npx expo install`; requires a new native build.
  - **Custom keypad** (`components/Keypad.tsx`): digits, `000`, decimal separator for EUR only, delete, and the operators `+ − × ÷`.
    **Calculator** in `src/domain/calc.ts`: evaluates the expression directly to minor units with integer arithmetic (× and ÷ rounded half-up), plus tests.
  - **1-tap category:** the 8 most-used categories of the last 90 days as chips, plus "All…". The **last account** (`last_account_id`) is the default.
  - **Haptics** (`expo-haptics`): `selectionAsync` per keypad key, `notificationAsync(Success)` on save.
  - **Conversion preview:** while typing EUR, "≈ Rp 253.440" is shown, and vice versa, using the latest ECB rate along with its date (hidden if there is no rate yet).
  - Date chip (default "Today", opens `@react-native-community/datetimepicker`) and an optional note. Edit mode loads the same transaction into the sheet, plus a Delete button.
  - Files: `components/{QuickAddSheet,Keypad,CategoryChips}.tsx`, `hooks/useQuickAdd.ts`, `repos/transactions.ts` (update/delete, most-used categories).
- **Manage accounts:** `AccountsScreen.tsx` and `AccountFormScreen.tsx` (add, rename, archive; currency locked if the account already has transactions).
- **Transaction list:** `TransactionListScreen.tsx` uses `FlatList` + the ledger components from Phase 1.5, grouped by date, with month/account/category/type filters
  and pagination (`LIMIT/OFFSET`). Transfers and fees are shown too. Tapping a row opens the quick-add sheet in edit mode.
- **Transfer:** `TransferFormScreen.tsx`. The user picks the source and destination accounts and enters the amount sent, the amount received, and the fee (optional, in the source account's currency).
  The actual rate is shown (e.g. "1 EUR = Rp 17.100") together with its difference from that day's ECB rate. If the currency is the same, the amount received is automatically = the amount sent.
  Transfers can be edited and deleted. Repo: `repos/transfers.ts`.
- **Navigation:** `src/navigation/{types,RootNavigator}.tsx` with typed params.
  - Edit category: `goBack()`. Detail only receives `categoryId` and reads the name from the DB on focus.
  - Delete category/account: `popTo('Dashboard')`.
  - Dynamic header titles (Add/Edit).
  - CategoryDetail receives a `month` param from the Dashboard.
- **Delete category:** rejected if still in use (FK RESTRICT). The UI offers "move transactions to another category" or "archive".

### Steps
1. `feat(db): add transfers with fee, fx_rates and ledger view (v2)` + test for balances with cross-currency transfers and fees.
2. `feat(db): add transfer and fx rate repos` + test (implied rate, same-account ban, latest rate per date, only EUR→IDR accepted).
   Then `feat(domain): derive EUR/IDR rates with BigInt conversion` + the overflow/precision tests above.
3. `feat(fx): fetch ECB rates from Frankfurter with daily cache` + test (mocked fetch: success, offline, malformed response, no second fetch on the same day).
4. `feat(domain): calculator expressions in minor units` + test.
5. `refactor(nav): typed root navigator`, `fix(nav): use goBack/popTo after category edit/delete`, and `fix(nav): dynamic header titles`.
6. `chore: add bottom sheet, reanimated, gesture handler, haptics and date picker`.
7. `feat: quick-add sheet with keypad, calculator and category chips`.
8. `feat: conversion preview in quick-add` and `feat: remember last account`.
9. `feat: edit and delete transactions in the sheet` + `refactor: remove TransactionFormScreen`.
10. `feat: accounts list and form`.
11. `feat: per-currency balances with ≈ combined total on dashboard`.
12. `feat: transaction list with filters and pagination`.
13. `feat: transfer between accounts with actual rate and fee`.
14. `feat: reassign or archive category on delete`.

**Done criteria**
- Tests: account balances are correct after income, expense, an EUR→IDR transfer with a fee, edit, and delete. Transfer amounts do not affect the income/expense totals; the fee counts as an expense.
  Calculator: `12,5+3,2` = 1570 (EUR), `10000×3` = 30000 (IDR), division rounded half-up, invalid expressions rejected.
  Conversion: all BigInt tests above pass (€100.000 and Rp 10.000.000.000 without overflow, the float precision case).
- Manual:
  - **Add a transaction in < 5 seconds:** open the sheet, type `12,5+3,2`, tap a category, save. €15,70 is stored in the last account, with a noticeable haptic.
  - The conversion preview shows "≈ Rp …" with the ECB rate date. In airplane mode, the last rate is still used. Fresh install without internet: the "≈" total and the preview are hidden.
  - Transfer €200,00 → Rp 3.420.000 with a €1,50 fee: the EUR balance drops by €201,50, the IDR balance rises by Rp 3.420.000, the rate shows "1 EUR = Rp 17.100", and this month's spending increases by €1,50 "Transfer fee".
  - Editing and deleting transactions from the list works. The date can be set in the past, and the transaction appears in the correct month.
  - After renaming/deleting a category, the back button does not open a stale screen or a form.

---

## Phase 2.1: Hide balances

Goal: open the app in public without revealing amounts.

- Eye icon in the Dashboard header to toggle it on/off; the state is stored in `settings` (`hide_balances`) and applies to every screen.
- Single point of control: the `<Money>` component reads the state from `PrivacyProvider`. When on, amounts show as "€ ••••" / "Rp ••••"
  (no sign and no count-up animation), and screen readers announce "Balance hidden".
  The display logic is in the pure function `moneyDisplay()` (`domain/money.ts`) so that it can be tested.
- The amount being typed in quick-add (and its conversion preview) stays visible (`<Money reveal>`). Text inputs in the account/transfer forms stay visible.
- Settings: "Hide in the widget too" (`hide_balances_widget`). The widget hides balances only if both settings are on,
  and is updated right after the state changes (`requestWidgetUpdate`).
- Header: on narrow screens (< 380 dp), the wordmark shows only the logo so that the eye icon fits.

**Files:** `src/privacy/PrivacyProvider.tsx`, `src/components/EyeIcon.tsx`, `src/widget/data.ts` (+ test), `src/widget/refresh.ts`,
`src/domain/money.ts` (`MASK`, `moneyDisplay`), `src/db/repos/settings.ts`, `Money.tsx`, `AppHeader.tsx`, `SettingsScreen.tsx`, `QuickAddSheet.tsx`.

**Done criteria**
- Tests: `moneyDisplay` masks and provides an accessibility label; the setting is persisted; widget data is masked only if both settings are on.
- Manual: the eye toggle masks the Dashboard, category detail, transaction list, accounts, subscriptions; the state survives closing the app;
  quick-add still shows the typed figures; TalkBack announces "Balance hidden"; the widget is masked too if the option is on.

---

## Phase 3: Budget per category/month, recurring rules, subscriptions

### Schema v3 (migration `003_budgets_recurring.ts`)

```sql
CREATE TABLE budgets (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month       TEXT    NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  currency    TEXT    NOT NULL CHECK (currency IN ('IDR','EUR')),  -- actual = category expense from accounts in this currency
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
  frequency           TEXT    NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  interval_count      INTEGER NOT NULL DEFAULT 1 CHECK (interval_count >= 1),
  start_date          TEXT    NOT NULL,
  end_date            TEXT,                      -- NULL = no end; "stop" = set this date
  paused              INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0,1)),
  last_generated_date TEXT
);

ALTER TABLE transactions ADD COLUMN recurring_rule_id INTEGER REFERENCES recurring_rules(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX idx_tx_rule_date ON transactions(recurring_rule_id, date) WHERE recurring_rule_id IS NOT NULL;
```

### Features & files
- **Budget:** `BudgetScreen.tsx` (per month) shows the category list with progress bars (spent / limit, per currency), a "Copy from last month" button, and warnings at ≥ 80% / > 100%.
  Progress also shows in `CategoryDetailScreen.tsx`, and a summary of over-budget categories shows on the Dashboard.
  Domain: `src/domain/budget.ts` (status, percentage, remaining budget per currency). Repo: `repos/budgets.ts`.
- **Recurring:**
  - `src/domain/recurrence.ts` contains `occurrences(rule, fromDate, toDate)`. Days 29–31 are clamped to the end of the month, and `paused`/`end_date` rules are respected.
  - `repos/recurring.ts` contains `materializeDue(today)`: creates the transactions due up to **today** (not in the future). This function is idempotent thanks to the unique index, and is called on app start, when the app returns to the foreground (`AppState`), and from the widget.
  - `RecurringListScreen.tsx` (list of rules; pause/resume/stop/delete) and `RecurringFormScreen.tsx`. The quick-add sheet has a "Repeat" toggle that creates a rule together with its first occurrence.
  - Editing a rule only applies to future occurrences. Transactions that were already created stay and can be edited one by one.
- **Subscriptions:** `SubscriptionsScreen.tsx` shows the active expense recurring rules (e.g. Spotify, Free Mobile, insurance):
  amount, frequency, next due date, and the **monthly total per currency** (weekly ×52/12, yearly ÷12, rounded per minor unit).
  Domain: `monthlyEquivalent(rule)` and `nextDueDate(rule, today)` in `recurrence.ts`.
- **Daily frequency** (added 2026-10-31): `daily` with `interval_count` (e.g. every 2 days) in the schema, `recurrence.ts`, the form, and the tests.
  Monthly equivalent of a daily rule = amount × 365 / 12 / interval.
- **Restore archived categories** (added 2026-10-31): a `CategoriesScreen.tsx` screen (from Settings) with the list of active categories and an "Archive" section
  with a "Restore" button. Repo: `listArchivedCategories`.

### Steps
1. `feat(db): add budgets and recurring_rules (v3)` + v2→v3 migration test.
2. `feat(domain): recurrence occurrences with tests` (end of month, leap year, weekly/yearly, interval, pause, end).
3. `feat(db): idempotent recurring materialization` + test (two runs give the same result).
4. `feat(domain): budget status with tests`.
5. `feat: budget screen with copy-from-previous-month`.
6. `feat: budget progress on dashboard and category detail`.
7. `feat: recurring rules list and form` and `feat: repeat toggle in quick-add`.
8. `feat: materialize recurring on start and foreground`.
9. `feat(domain): monthly equivalent and next due date` + test, then `feat: subscriptions view`.

**Done criteria**
- Tests: a monthly rule on the 31st produces 28/29 Feb, 30 Apr, etc. Double materialisation creates no duplicates. A stopped rule produces no new transactions.
  Monthly equivalent: €9,99/week → €43,29/month, Rp 1.200.000/year → Rp 100.000/month.
  Daily: a rule every 2 days starting 30 Oct produces 30 Oct, 1 Nov, 3 Nov; €1/day → €30,42/month.
- Manual: set a Food budget of €300, then record €250; progress shows 83% with the warning color. "Copy from last month" works.
  A monthly rent rule appears once per month and stops after it is stopped. The subscriptions screen shows the EUR and IDR totals separately.
  Archived categories appear under "Archive" and can be restored.
- Widget/Dashboard/list totals are consistent (recurring entries are now real transactions, not virtual calculations).

---

## Phase 4: Widget, charts, backup

### Files & features
- **Widget** (`src/widget/*`, `src/db/events.ts`, `app.json`):
  - The widget shows the **remaining budget for this month per currency** (total limit − spent for budgeted categories; if there is no budget yet, the balance per currency), formatted via `money.ts`
    and colored according to the Buku Kas tokens.
  - **Quick-add via deep link:** the "+ EUR" and "+ IDR" buttons open `budgetapp://add?account=<id>` (optionally `&category=<id>`), which opens the quick-add sheet prefilled.
    `scheme` in `app.json`, `linking` in the navigator, and the parameters are validated (unknown ids are ignored).
  - The handler opens the DB through the same `initDb` (PRAGMA, migrations) and runs `materializeDue`.
  - `notifyDataChanged()` is called on every repo mutation and then triggers `requestWidgetUpdate`. Tapping anywhere else opens the app.
- **Charts** (`DashboardScreen.tsx` or a new `InsightsScreen.tsx`, `repos/reports.ts`), in the Buku Kas style:
  - A thin donut of spending per category for the selected month (per currency), with no labels inside and a table legend below it.
  - 6-month spending trend as simple bars: one EUR chart (indigo) and one IDR chart (turmeric), no gradients.
  - Uses the already installed `react-native-gifted-charts`.
- **Backup** (`src/db/backup.ts`, `SettingsScreen.tsx`):
  - JSON export (`{ schemaVersion, exportedAt, accounts, categories, transactions, transfers, fx_rates, budgets, recurring_rules }`) and transaction CSV export, shared via `expo-file-system` + `expo-sharing`.
  - JSON import: validate the version and data shape, confirm, then replace all contents in a single DB transaction.

### Steps
1. `feat(db): central data-change event`.
2. `feat(widget): remaining budget per currency`.
3. `feat(widget): refresh on data change`.
4. `feat(nav): budgetapp://add deep link opens quick-add` + parameter parsing test.
5. `feat(widget): quick-add buttons per currency`.
6. `feat(reports): category breakdown and monthly trend queries` + test.
7. `feat: category donut and 6-month trend charts`.
8. `feat(backup): JSON export/import with validation` + round-trip test (export → import → identical contents).
9. `feat(backup): CSV export of transactions`.

**Done criteria**
- The widget shows the same figures as the Budget/Dashboard screens, and updates within seconds after a transaction is saved.
  Tapping "+ EUR" opens quick-add with the EUR account selected. From a closed app to saved in < 5 seconds.
- `adb shell am start -d "budgetapp://add?account=999"` does not crash (unknown id is ignored).
- The charts match the summary figures for the same month.
- The backup round-trip test passes. Manually: export → reset → import restores the data intact. A corrupt JSON file is rejected with a clear message.

---

Deviations from the plan (Phase 5):
- **Theme** (added 2026-10-31): Settings → Theme (Follow system / Light / Dark) via `Appearance.setColorScheme`; the widget uses
  the same choice (one appearance, not light+dark) except with "Follow system".
- The Android date picker gets the token colors through the datetimepicker config plugin (`app.json`, checked by the test `date-picker-theme.test.ts`).
  Its month names/buttons follow the chosen language through the local module `modules/app-locale` (`AppCompatDelegate.setApplicationLocales`).
- The default accounts moved from migration 001 to `ensureDefaults` (`src/db/defaults.ts`, once per database, flag `defaults_created`).
  Existing databases: nothing is added as long as the account/category tables already have rows.
- "Follow system" reads the phone's **primary** language (`id`/`in` → Indonesian, anything else → English).
- Hardcoded-string test based on the TypeScript AST (`src/i18n/__tests__/hardcoded-strings.test.ts`), plus a test that the id/en keys & placeholders are identical.
- Confirmation of destructive actions (delete category/transfer/rule, restore backup, reset) stays a dialog; deleting a transaction has no dialog and can be undone.
- Found during testing: nested transactions on the shared connection (app + widget task running `materializeDue` at the same time on start)
  → `serializeTransactions` (`src/db/serialize.ts`). The widget description in the widget picker is now English + a `values-in` translation.
- Keyboard in forms: Android 15+ (edge-to-edge) no longer resizes the window, and KeyboardAvoidingView on Android pushed the form up twice
  and then left padding behind after the keyboard was closed. `FormScroll` now shrinks the scroll area by the keyboard height and scrolls
  the focused field above the keyboard (Android); KeyboardAvoidingView only on iOS. Found while making the showcase; released as 1.0.2.
- English showcase: `docs/showcase/en/` (screens, 9-slide carousel + PDF with zoom callouts, 15.8 s video).

## Phase 5: UX & accessibility

The visual part (contrast, light/dark theme, splash) has already been moved to Phase 1.5.

### Files & features
- **Language (revised 2026-10-31): Indonesian + English.** All UI strings, widget text, error messages and accessibility labels go through `src/i18n/` (`t()`).
  - Settings → Language: "Follow system" (default), "Bahasa Indonesia", "English". Stored in `settings`, applies immediately without a restart, including the widget.
    "Follow system" = Indonesian if the phone language is `id`, otherwise English.
  - Month/day names and the date format follow the language. So does the number format: id "€ 2.655,38", en "€2,655.38". Amount input accepts both formats (with tests).
  - Default categories and sample data are created in the language active at install time. User-created names are not translated.
  - Automated test: no hardcoded UI strings outside `src/i18n` (`src/i18n/__tests__/hardcoded-strings.test.ts`, based on the TypeScript AST).
- **Default categories** for new installs (separate from the seed): Salary, Rent, Food & Groceries, Transport, Bills, Entertainment, Health, Other
  (or the Indonesian equivalents). Created if the `categories` table is empty.
- **Date picker** follows the Buku Kas theme (light/dark), not the default teal.
- **Release:** when done, version 1.0.1 (versionCode 2), a release build with the same key, a test checklist (including changing the system language & the manual choice).
- **Accessibility:** `accessibilityRole`/`accessibilityLabel`/`accessibilityState` on every `Pressable`/`Button`, including the keypad. Minimum touch target 48dp.
  Use `minHeight` instead of a fixed `height` to stay safe with large fonts. `<Money>` is read out in full by screen readers (e.g. "minus 12 euros 50 cents").
- **Forms:** inline validation via `Input.error` (Alert removed). `KeyboardAvoidingView` + `keyboardShouldPersistTaps="handled"`. The Save button is disabled while the input is invalid.
- **Screen states:** loading, empty (with a call to action), and error (with a retry button). A global `ErrorBoundary`, plus a fallback if `initDb` fails.
- **Feedback:** the "Success" Alert is replaced by a lightweight toast/snackbar. Deleting a transaction can be undone for a few seconds.
- **Layout:** lists/grids use `useWindowDimensions` (responsive for tablets).
- **Cleanup:** reset button for dev only.

### Steps
One commit per area: `feat(i18n)`, `feat(a11y): labels and roles`, `fix(a11y): touch targets and font scaling`, `feat(a11y): spoken amounts`,
`feat(forms): inline validation and keyboard handling`, `feat: loading/empty/error states`, `feat: error boundary and db init fallback`,
`feat: toast and undo delete`, `fix(layout): responsive widths`.

**Done criteria**
- Navigating the whole app with TalkBack works smoothly: every control has a label and a role that are announced, including the keypad.
- With the system font at 200%, no text is cut off on the main screens.
- No `Alert.alert('Success'...)` and no mixed-language UI strings.

---

## Phase 6: Backlog (not scheduled)

Ideas from the research, noted down, **not** commitments. Each item is detailed and approved separately before work starts (migration v4+).

- **Templates/favorites + title suggestions:** save account + category + amount + note combinations as templates, shown in quick-add.
  Note suggestions from history (e.g. "Carrefour", "Crous", "transfer to parents").
- **Search + filter + tags:** text search in notes and free-form tags (`#liburan`, `#kampus`) via `tags` + `transaction_tags` tables.
- **Monthly review:** a compact screen on the 1st of each month: totals per currency, top 3 categories, budgets met or not, and
  **this month's conversion cost** = Σ (ECB rate on the transfer date − implied rate) × amount + explicit fees.
- **Optional daily reminder:** `expo-notifications`, adjustable time, "Nothing recorded today yet", with an action that opens quick-add.
- **Savings goals:** targets per currency (e.g. a ticket home to Jakarta, an apartment deposit) with a progress bar.
- **Backup reminder / automatic backup** (added 2026-10-31): the data only lives on the phone, so it is lost if the phone breaks/is lost or the app
  is uninstalled. Incremental options: (1) a periodic reminder ("Last backup 30 days ago") with the last backup date in Settings;
  (2) automatic backup to a user-chosen folder (Storage Access Framework, e.g. a folder synced by Drive) every N days, keeping
  the last few versions; (3) restore check: preview the backup contents before replacing. No server/account.

---

## Decisions (2026-10-31)

1. **Android package id:** `com.daffarivaldi.budgetapp`, changed in Phase 0. The app will install as a new application.
2. **UI language:** Indonesian. The i18n structure is prepared in Phase 5 (revision: Phase 5 adds English, see there). Account/category names in the seed are in Indonesian.
3. **Combined total:** shown as "≈" in **EUR** (default `base_currency`, changeable in Settings) using the **ECB rate from the `fx_rates` table**
   along with its rate date, and hidden if there has never been a rate (Phase 2). *Replaces the original decision of "last transfer rate" in IDR.*
4. **Currency:** IDR and EUR are enough.
5. **Visual direction:** Option A "Buku Kas" from [docs/RESEARCH.md](docs/RESEARCH.md), follows system light/dark (Phase 1.5).

6. **Transfer fee:** in the source account's currency, on top of the amount sent; included in the monthly summary as "Transfer fee", not in category budgets.
7. **Rates:** `fx_rates` only stores EUR→IDR (`rate_micro`); IDR→EUR is derived when computing. All conversions use BigInt.
8. **Widget without a budget:** shows the balance per currency.

Revisions at the first approval: `DROP TABLE` one by one; default accounts created by migration v1 (not by the seed);
the Phase 1 checklist includes checking `formatMoney` on Hermes.
Revisions at the second approval (Phase 1.5–6): text color variants approved; `fx_rates` base EUR only; `base_currency` default EUR.
