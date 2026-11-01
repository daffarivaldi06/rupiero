# BudgetApp — Codebase Analysis Report

> Written 2026-10-31 from a read-through of the entire source (`App.tsx`, `index.ts`, `app.json`, `package.json`, `src/**`).
> Total application code ±1,600 lines of TypeScript. No files were changed other than this report.

---

## 1. Summary

**Purpose:** a personal finance tracking app (offline, Android-first) for recording income/expenses
per category in two currencies (IDR & EUR), with an Android widget for viewing the balance.

**Existing features**
- Monthly dashboard: "Sisa Uang" ("money left") balance, total income/expense, month navigation `<` `>` — `src/screens/DashboardScreen.tsx`
- Category CRUD (add, rename, delete along with all its transactions) — `CategoryFormScreen.tsx`, `CategoryDetailScreen.tsx`
- Add transaction: type, currency (IDR/EUR), amount, category, note, "recurring monthly" flag — `TransactionFormScreen.tsx`
- Category detail: current-month summary + transaction list — `CategoryDetailScreen.tsx`
- Settings: display currency, manual EUR→IDR rate, reset all transactions — `SettingsScreen.tsx`
- "Budget Summary" Android widget — `src/widget/Widget.tsx`, `src/widget/widget-task-handler.tsx`

**User flow**
1. Open the app → Dashboard (current month) → grid of category cards + "Add Category" button.
2. Tap a category → Category Detail → `+ Income` / `- Expense` → Transaction Form modal (category & type locked) → save → back.
3. Header right "Settings" → change display currency / rate / reset data.
4. Note: **there is no entry point** to the Transaction Form without a category (the `TransactionForm` route without params is never called),
   so the form's "pick/type a free-form category" mode is practically unreachable.

---

## 2. Tech stack & architecture

| Aspect | Detail |
|---|---|
| Framework | Expo SDK 54, React Native 0.81.5, React 19.1, New Architecture enabled (`app.json:7`) |
| Language | TypeScript 5.9, `strict: true` (`tsconfig.json`) |
| Navigation | `@react-navigation/native` 7 + `native-stack` — a single stack in `App.tsx:32-72` |
| Database | `expo-sqlite` 16 (`SQLiteProvider` + `useSQLiteContext`), file `budget.db` |
| Widget | `react-native-android-widget` 0.20 (config plugin in `app.json:32-46`, handler in `index.ts:7`) |
| Chart | `react-native-gifted-charts` (imported but **not rendered**) |
| Unused | `expo-file-system`, `expo-sharing`, `expo-linear-gradient` (installed, 0 imports) |
| State management | Only local `useState` per screen; data is reloaded from SQLite via `useFocusEffect`. No global store/cache. |
| API / backend | None. 100% local/offline. |

**Folder structure**
```
App.tsx                  # navigator + SQLiteProvider + RootStackParamList
index.ts                 # registerRootComponent + registerWidgetTaskHandler
src/components/          # Button, Card, Input (UI primitives)
src/db/database.ts       # schema, migrations, seed, every query (a single "repository" file)
src/screens/             # 5 screens
src/theme/colors.ts      # colour palette (dark)
src/widget/              # UI widget + task handler (headless)
android/                 # prebuild output (in .gitignore)
```

**Build & run**
- `npm install` then `npx expo run:android` (a *development build* is required: the native widget module does not run in Expo Go).
- `npm start` = Metro dev server for an already-installed dev build.
- `npm run ios`: can build, but the widget is Android-only.
- `npm run web`: most likely fails, because `react-dom`/`react-native-web` are not in `package.json`, and expo-sqlite on web needs extra setup.
- No `eas.json`, lint, formatter, or CI. The package id is still `com.anonymous.BudgetApp` (`app.json:24`).

---

## 3. Data model

Schema in `src/db/database.ts:27-47`:

```
transactions(id PK, amount REAL, type TEXT, category TEXT, note TEXT,
             date TEXT ISO-UTC, currency TEXT DEFAULT 'IDR', is_recurring INTEGER 0/1)
categories  (id PK, name TEXT UNIQUE)
settings    (id=1 CHECK, displayCurrency TEXT, eurToIdrRate REAL DEFAULT 17000)
```

**Relations**
- `transactions.category` → `categories.name` via the **name string**, with no foreign key. Rename and delete
  are synced manually (`updateCategory` :92, `deleteCategory` :99).
- A transaction can have a category that does not exist in the `categories` table (free-form input in `TransactionFormScreen.tsx:129-133`).
  Such transactions count toward the Dashboard totals but have no card, so they cannot be viewed or deleted.
- `settings` is a singleton: one global rate for all transactions, including historical ones.
- **There is no Budget entity** (limit/allowance), despite the app being named "BudgetApp". There is no Account/Wallet and no RecurringRule.
- TS interfaces: `Transaction`, `Category`, `AppSettings` (`database.ts:3-23`). Column naming is mixed:
  `is_recurring` (snake) vs `displayCurrency` (camel), mapped manually in `getTransactions` :145-148.

---

## 4. Screens & components

| Screen | File | Contents |
|---|---|---|
| Dashboard | `src/screens/DashboardScreen.tsx` | Month picker, balance card, category grid (width computed from static `Dimensions` :14-15) |
| CategoryDetail | `src/screens/CategoryDetailScreen.tsx` | Edit/Delete category, summary of the **current month only** (:24-25), transaction list via `.map` |
| CategoryForm (modal) | `src/screens/CategoryFormScreen.tsx` | A single name input; add/edit mode |
| TransactionForm (modal) | `src/screens/TransactionFormScreen.tsx` | Type, currency, amount, category, note, recurring switch |
| Settings | `src/screens/SettingsScreen.tsx` | Display currency, rate, danger zone |

**Components:** `Button` (3 variants, `loading`), `Card`, `Input` (label, `error`, an `isCurrency` mode that formats thousands).
Widget: `BudgetWidget` (FlexWidget/TextWidget) and `widgetTaskHandler`, which opens its own SQLite connection.

---

## 5. Code quality

**What is tidy**
- DB access is centralised in one module. Queries use parameter binding (safe from SQL injection).
- Multi-statement operations use `withTransactionAsync` (`database.ts:93,100`).
- `RootStackParamList` is defined (`App.tsx:17-23`). The color palette is centralised in `src/theme/colors.ts`.
- UI components are small and consistent. An `Alert` confirmation precedes destructive actions.

**What is messy / duplicated**
- The currency symbol (`=== 'EUR' ? '€' : 'Rp'`) is repeated in Dashboard :57, CategoryDetail :73/:141, TransactionForm :97, and the Widget (hardcoded "Rp").
- The balance card (balance + income/expense) is duplicated in Dashboard :81-94 and CategoryDetail :101-119.
- The `loadData`/`onRefresh`/`useFocusEffect` pattern is copied across two screens. The IDR/EUR button pair exists in both Settings and TransactionForm.
- Month format: Dashboard uses `toISOString().slice(0,7)` (UTC, :23), CategoryDetail uses `getMonth()` (local, :25).
- Loose typing: `useRoute<any>()` in 3 screens, `useNavigation<any>()` (`CategoryFormScreen.tsx:13`), `getAllAsync<any>` and `params: any[]` (`database.ts:129,144`).
- The widget hardcodes colors (`Widget.tsx:17,26,43,48`) instead of using `colors`.
- Unused imports: `useEffect` and `PieChart` (Dashboard), `useEffect` (CategoryForm), `navigation` (Settings :14).

**Visible bugs & risks**
1. **EUR cannot have decimals.** `Input` with `isCurrency` strips every non-digit (`Input.tsx:19`), so "12.50" is saved as 1250 €. The same applies to the rate input in Settings (:114).
2. **Navigation stacks screens** (React Navigation 7: `navigate` no longer returns to a route already in the stack; verified in `StackRouter`):
   - After a rename, `navigate('CategoryDetail')` (`CategoryFormScreen.tsx:32`) pushes a new detail on top of the modal. The back button returns to the edit form and to the old detail with the stale name.
   - After a delete, `navigate('Dashboard')` (`CategoryDetailScreen.tsx:62`) pushes a second Dashboard. The back button opens the detail of the deleted category.
   - Fix: `goBack()` / `popTo()` / `navigation.setParams`.
3. **Fake recurring that cannot be stopped.** Recurring transactions are recounted in every month ≥ the month they were created, with no end (`database.ts:132,135`). There is no transaction edit or delete, so recurring cannot be turned off. Queries without a month filter (widget) count them only once, so the widget total ≠ the Dashboard total.
4. **Time zone.** `date` is stored in UTC (`TransactionFormScreen.tsx:51`) and grouped with UTC `strftime`. Transactions on the 1st between 00:00–07:00 WIB land in the previous month. The Dashboard's default month is also UTC.
5. **Widget is wrong and stale:** always "Rp" even when the display currency is EUR (`Widget.tsx:29,43,48`), shows the *all-time* balance (not monthly), and is never refreshed after a transaction (`requestWidgetUpdate` is not called).
6. **Conversion uses the current rate** for all history (`database.ts:169-173`). Changing the rate also changes past months' balances.
7. Deleting a category also deletes all its transactions, with no option to move them to another category (`database.ts:102`).
8. The `ALTER TABLE` migration is wrapped in an empty `try/catch {}` (`database.ts:50-56`), with no schema version. Other errors get swallowed too.
9. `SQLiteProvider` has no error handling: if `initDb` fails, the app crashes without a message.
10. `getBalance` fetches every row and then sums in JS. CategoryDetail runs the transaction query twice (:29-31).

**Tests:** none at all (no jest/jest-expo, no `*.test.*` files), and no ESLint/Prettier.

---

## 6. UX (as visible from the code)

- **Validation:** only via `Alert`. The `error` prop on `Input` is never used. An amount of `0` is accepted (`TransactionFormScreen.tsx:36`). No length limit on names/notes. Category names are unique case-sensitively.
- **Error handling:** load failures only `console.error` (Dashboard :33, CategoryDetail :34), and the user sees empty data. `loadSettings` has no try/catch.
- **Number input:** the thousands separator in the input uses commas (`Input.tsx:13`), while the display uses dots (`id-ID`). This is confusing for Indonesian users. Conversion results show up to 3 decimals (e.g. "€ 1,176").
- **Transactions:** the date cannot be picked (always "now"). Transactions cannot be edited or deleted. There is no list of all transactions and no search.
- **Excessive feedback:** every currency change shows a "Success" Alert (`SettingsScreen.tsx:33`).
- **Type is locked but the buttons still look pressable** (only opacity 0.3, `TransactionFormScreen.tsx:69-76`).
- **Keyboard:** no `KeyboardAvoidingView` and no `keyboardShouldPersistTaps`, so tapping a category chip while the keyboard is open takes two taps.
- **Accessibility:** no `accessibilityLabel`/`accessibilityRole` on any `Pressable`. The month buttons are just `<` `>` text with small touch targets (`DashboardScreen.tsx:141`). Fixed heights (50/52px) can clip text at large font scaling. White text on `#FF3D00` has a contrast of about 3.6:1 (< 4.5).
- **Mobile/theme:** the app is dark but `userInterfaceStyle: "light"` and the splash is white (`app.json:8,11`). Grid width comes from static `Dimensions`, not responsive for tablets/rotation (`supportsTablet: true`).
- **Mixed languages:** "Sisa Uang" (`DashboardScreen.tsx:82`), while the rest of the text is in English. The seed category "Prancis" (Indonesian for "France") is personal (`database.ts:61`).
- The modal header title is always "New Category" even in edit mode (`App.tsx:60`).
- The transaction list uses `.map` in a `ScrollView` (no virtualisation), so it is slow for hundreds of items.

---

## 7. Half-finished features, TODOs, dead code

- **PieChart:** `pieData` is computed (`DashboardScreen.tsx:59-62`) but never rendered. The chart library and `react-native-svg` are not used yet.
- **`deleteTransaction`** (`database.ts:151`) has no UI.
- **Free-form category mode** in TransactionForm (`:112-134`) is unreachable from any navigation.
- **Widget:** the `WIDGET_CLICK` / `WIDGET_DELETED` handlers are empty ("Not needed for now", `widget-task-handler.tsx:34-40`). There is no `clickAction` to open the app.
- **CategoryDetail month filter:** comment "can be expanded to filter by month" (`:23`). The detail always shows the current month, even when the Dashboard is showing another month.
- **Orphaned dependencies:** `expo-file-system` + `expo-sharing` (a hint of planned export/backup), `expo-linear-gradient`.
- "Clear all transaction data **for testing purposes**" (`SettingsScreen.tsx:126`): a leftover dev feature in the production UI.
- Example rate text "Rp. 20.000" vs the default 17000 (`SettingsScreen.tsx:106` vs `database.ts:45`).
- `.idea/` is not yet in `.gitignore`. None of the `src/` code has been committed (there is only the initial commit from create-expo-app).

---

## 8. Overhaul opportunities

| # | Idea | Rationale | Effort | Affected files |
|---|---|---|---|---|
| 1 | **Integer money model + per-currency balances** (see §9) | Fixes the EUR decimal bug and float accuracy, and separates the EUR/IDR balances | L | `database.ts`, `Input.tsx`, all screens, `Widget.tsx` |
| 2 | **Relational schema + versioned migrations**: `category_id` FK, `PRAGMA user_version`, `foreign_keys=ON`, indexes | Removes name-based syncing, orphaned transactions, and `try/catch` migrations | M | `database.ts`, `TransactionFormScreen.tsx`, `CategoryDetailScreen.tsx` |
| 3 | **Full transaction management**: an all-transactions list screen (FlatList), edit, delete (swipe/long-press), date picker, search/filter | Currently mis-entered data cannot be corrected; this is the biggest functional gap | M | new `TransactionListScreen.tsx`, `TransactionFormScreen.tsx`, `App.tsx`, `database.ts` |
| 4 | **A real Budget feature**: a `budgets(category_id, month, limit_minor, currency)` table + progress bar and over-budget warnings | Matches the app's name; the main value that is missing | M | `database.ts`, `DashboardScreen.tsx`, `CategoryDetailScreen.tsx`, `CategoryFormScreen.tsx` |
| 5 | **Proper recurring**: a `recurring_rules` table (start, end, interval, day), materialising transactions per period, pause/stop | Recurring is currently perpetual, cannot be stopped, and is inconsistent across queries | M–L | `database.ts`, `TransactionFormScreen.tsx`, new "Recurring" screen |
| 6 | **Domain layer + hooks + tests**: `money.ts` (parse/format), `useMonthlySummary`, `useCategories`, aggregation via SQL `SUM … GROUP BY`; jest-expo + tests for utils and queries | Removes duplication, fixes time zones in one place, and prevents regressions | M | `src/db/*`, new `src/domain/*`, `src/hooks/*`, all screens |
| 7 | **Insights & charts**: per-category pie, 6-month trend (library already installed) | The chart code is already half done; adds visual value for little effort | S–M | `DashboardScreen.tsx`, `CategoryDetailScreen.tsx` |
| 8 | **Backup/Export/Import** CSV/JSON via `expo-file-system` + `expo-sharing` | Data is local only, and there is a "reset" button with no backup; the dependencies are already there | S–M | `SettingsScreen.tsx`, new `src/db/backup.ts` |
| 9 | **A correct widget**: currency per the setting, monthly summary, `requestWidgetUpdate` after mutations, tap opens the app or the add form | The widget currently shows wrong/stale numbers | S | `src/widget/*`, `database.ts`, `TransactionFormScreen.tsx` |
| 10 | **UX/a11y/i18n pass**: one language (or ID/EN i18n), accessibility labels, `KeyboardAvoidingView`, inline validation via `Input.error`, dynamic headers, `userInterfaceStyle: dark`, color contrast | Baseline mobile quality and accessibility | M | all screens, `components/*`, `app.json`, `colors.ts` |

Suggested order: **2 → 1 → 6 → 3 → 9**, then 4/5/7/8/10. Schema changes are best done once,
before user data grows.

---

## 9. Multi-currency

**Current status**
- **Partially** supported: each transaction has a `currency` `'IDR' | 'EUR'` (`database.ts:10,35`). The union type is hardcoded in 4+ places.
- All balances are **merged into a single "display currency"** using one global manual rate (`getBalance`, `database.ts:155-185`).
  There are no separate EUR and IDR balances.
- Amounts are stored as **`REAL` (float64)** and summed with JS floats. IDR→EUR conversion (division) produces endless fractions.
- In practice, decimal EUR input is **impossible**, because `Input.tsx:19` strips dots/commas (see §5 bug #1).
- A single `REAL` rate with no history. Changing the rate also changes every converted historical value.

**What needs to change for separate, accurate EUR & IDR balances**
1. **Store integer minor units:** an `amount_minor INTEGER` column (EUR = cents, ×100; IDR = whole rupiah, ×1).
   Create a `currencies(code, symbol, minor_digits, locale)` table/constant instead of hardcoding the union.
2. **Data migration:** `UPDATE transactions SET amount_minor = CAST(ROUND(amount * 100) AS INTEGER) WHERE currency='EUR'`,
   and `ROUND(amount)` for IDR (note: old EUR data is likely already "accidentally ×100" because of the input bug, so it needs manual review).
3. **Per-currency balances:** `SELECT currency, SUM(CASE type WHEN 'income' THEN amount_minor ELSE -amount_minor END) … GROUP BY currency`.
   Show two balance cards (EUR, IDR). A combined total only as an *estimate* in the display layer.
4. **Optional but recommended:** an `accounts(id, name, currency)` entity (e.g. "IDR Wallet", "EUR Bank"), with `transactions.account_id`
   determining the currency. Add a two-legged **transfer/exchange** type (EUR out, IDR in) with the actual rate recorded.
5. **Rates:** an `exchange_rates(date, base, quote, rate_scaled INTEGER)` table (e.g. rate ×10⁶) or a rate snapshot per transaction.
   Convert with the rate on the transaction date, then round once at the end (banker's/half-up) to `minor_digits`.
6. **Input & formatting:** a locale-aware parser (accept `,`/`.` as decimal per currency, limit decimal digits = `minor_digits`).
   Format with `Intl.NumberFormat(locale, { style: 'currency', currency })`, centralised in `src/domain/money.ts`.
7. **Widget & UI** read the same format. Remove all hardcoded symbols.

---

## 10. Storage

**Type:** local SQLite via `expo-sqlite` (file `budget.db` in the app's documents directory), accessed from two places:
`SQLiteProvider` (`App.tsx:29`) and a separate connection in the headless widget task (`widget-task-handler.tsx:10`).
No AsyncStorage, cloud, or backup.

**Size/efficiency**
- Each transaction row is roughly 60–90 bytes + note (REAL 8 B, ISO date 24 B of text, repeated category-name text, `type` 6–7 B, `currency` 3 B).
  10,000 transactions ≈ 1 MB, so **size is not a problem**. What is inefficient is the **query pattern**.
- No indexes. The `strftime('%Y-%m', date)` filter cannot use an index (a full scan every time).
- `getBalance` loads **every row** into JS to sum and calls `getSettings` every time. CategoryDetail queries twice.
- Every screen focus triggers a full reload (no cache/invalidation).
- No explicit `PRAGMA journal_mode=WAL` / `foreign_keys`, even though there are two connections (app + widget) to the same file.

**Optimisation opportunities**
1. A `category_id INTEGER` FK replacing the text name (saves space, rename becomes O(1), integrity is preserved).
2. Store the local date as `date TEXT 'YYYY-MM-DD'` or an `INTEGER` epoch + a `month TEXT 'YYYY-MM'`/`INTEGER 202610` column,
   then `CREATE INDEX idx_tx_month_cat ON transactions(month, category_id)`. This also fixes the time-zone bug.
3. Aggregate in SQL (`SUM … GROUP BY currency, type`) instead of in JS. Paginate the transaction list (`LIMIT/OFFSET` + FlatList).
4. `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;` in `initDb`, plus `PRAGMA user_version` for sequential migrations.
5. `CHECK` constraints for `type`/`currency`, and `amount_minor INTEGER` (see §9).
6. A lightweight cache: a hook based on `addDatabaseChangeListener` (`enableChangeListener`) or React Query, to avoid blind reloads.
7. Backup: export a `.db`/JSON file via `expo-file-system` + `expo-sharing` (already installed), then import with validation.
