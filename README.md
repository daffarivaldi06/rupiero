# Rupiero

## What it is

Rupiero is a local-first budgeting web app for people who manage money in both euros and rupiah, like Indonesian
students in France. It keeps the two currencies side by side and shows what they add up to.

**Minimum moment of value:** in under a minute you record one expense in EUR and one in IDR, and the Dashboard shows
both balances plus your total converted into the currency you choose.

Rupiero is an Expo (React Native) app. The same code runs in the browser and on Android. The server only delivers the
app files; your data stays in your browser or on your device, with no account. Exchange rates are the European Central
Bank reference rates, fetched through [Frankfurter](https://frankfurter.dev).

## Features (user stories)

1. **Add income and expenses in EUR or IDR**, so that all my finances are in one place. *(Already existed.)*
2. **See my total balance converted into EUR or IDR**, so that I know how much I really have. *(Built in the demo.)*
3. **A monthly budget per category showing what's left**, so that I don't overspend. *(Already existed.)*
4. **Use Rupiero in the browser, with sample data to try it**, so that I can see what it does without installing anything. *(Built in the demo.)*

Stories 1 and 3 were built before this final project, with Claude Code working through the phases in [PLAN.md](PLAN.md).
Before the demo, the app already showed an approximate total in EUR only. Story 2 adds the choice between EUR and IDR.

**Backlog**
- Date picker on the web (the web build can only record transactions dated today)
- Backup and CSV export on the web
- Testing in mobile browsers
- Using the app in more than one tab at a time
- A single budget across both currencies (each currency has its own budget today)

## How to run it

**Requirements:** Docker, or Node 22 for development. The Android SDK is needed only to run on Android.

**Environment variables:** the web build needs none. [`.env.example`](.env.example) lists the optional ones:
`EXPO_PUBLIC_SEED_SAMPLE_DATA` (development only) and `ORG_GRADLE_PROJECT_RUPIERO_UPLOAD_*` (Android release signing only).

**Docker** (the production web build, served by nginx):

```bash
docker build -t rupiero-web .
docker run --rm -p 8080:8080 rupiero-web
```

Then open <http://localhost:8080>.

**Development without Docker** (Node 22):

```bash
npm install
npm run web                # Expo dev server for the browser, at http://localhost:8081
npx expo run:android       # or: build and run on an Android emulator or device
```

**Tests:**

```bash
npm test                   # Jest, including the real SQL run against an in-memory database
npm run typecheck
npm run lint
```

**Public URL:** `https://<service>-<hash>.europe-west1.run.app` *(added after the first Cloud Run deploy)*

## How it was built with AI

### CLAUDE.md

### PLAN.md phases

### The web feasibility check

### A real prompt

### What went well

### What was hard

## Status and next steps

*To be written after the demo on 13 November 2026.*

Known limits:
- **Data stays in one browser.** It is stored in that browser profile only. Another device, another browser, a
  private window or clearing site data each start empty.
- **One tab at a time.** A second tab cannot open the database while the first one is open.
- **expo-sqlite on the web is alpha.** Expo labels its web support as alpha and possibly unstable.

---

### Technical notes

- **Stack:** Expo SDK 54, React Native 0.81, TypeScript (strict), SQLite through `expo-sqlite`, React Navigation 7,
  Reanimated 4, `@gorhom/bottom-sheet`, and Jest (322 tests).
- **Money as integer minor units.** Every amount is a whole number of cents (EUR) or rupiah (IDR), and floats never
  hold money. Parsing and formatting are hand-written, so the output is identical on every platform.
- **Conversion in BigInt.** Only the ECB rate from EUR to IDR is stored, as an integer `rate_micro` (rate × 10⁶);
  IDR to EUR is derived from it. Conversions round half-up once, at the end.
- **Transfers keep both amounts.** A transfer stores what left one account, what arrived in the other, and the fee.
  The rate actually paid is derived from those amounts and compared with that day's ECB rate.
- **Versioned migrations** using `PRAGMA user_version`. All pending migrations run in one transaction. A database
  newer than the app is refused instead of being opened.
- **SQLite on the web** runs as WebAssembly in a Web Worker and is stored in the browser's Origin Private File System.
  The server must send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`.
- **No hard-coded UI text.** Every string goes through `src/i18n` (English and Indonesian). A test fails on any
  hard-coded string, and another fails if the two languages' keys differ.
- **Layout:** `src/domain` holds pure, tested logic; `src/db` holds migrations and repositories; `src/screens` and
  `src/components` hold the UI; `src/widget` holds the Android home-screen widget.
- **Android release builds:** see [docs/RELEASE.md](docs/RELEASE.md).
- **History:** [PLAN.md](PLAN.md) records the phases, decisions and deviations.
  [BUDGETAPP_REPORT.md](BUDGETAPP_REPORT.md) is the review of the original app.
