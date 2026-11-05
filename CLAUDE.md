# Rupiero

A local-first budgeting app for money kept in EUR and IDR, for example by Indonesian students in France. One Expo
codebase runs in the browser (the target for the course demo on 13 Nov 2026) and on Android. All data lives on the
device in SQLite, with no server and no account. [PLAN.md](PLAN.md) records the earlier phases, decisions and
deviations. [README.md](README.md) lists the user stories and the backlog.

## Stack

Expo SDK 54, React Native 0.81, TypeScript (strict), and `expo-sqlite`. On the web, SQLite runs as wa-sqlite
WebAssembly in a worker and is stored in OPFS. The UI uses React Navigation 7, Reanimated 4 and `@gorhom/bottom-sheet`.
Tests use Jest (`jest-expo`). The scripts are in `package.json`.

## Branches and commits

- `demo/main` is production and `demo/develop` is integration. Each feature gets its own branch,
  `demo/feature/<name>`, created from `demo/develop` and merged back into `demo/develop`.
- `master` is the repo's default branch (the course calls it "main"). Never commit to `master` or merge into it.
- The `demo/*` branches are for the web build on Vercel only: verify their work on the web (dev server, Docker
  build). The user's Android app stays on `master`, so never build, install or ask the user to test an Android APK
  from a demo branch. Keep Android code paths unchanged anyway, so the web work can be merged into `master` later.
- Use Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`), one small step per commit. Each
  commit passes `npm run typecheck` and `npm test`.
- Commit messages and PR descriptions never carry AI attribution: no `Co-Authored-By` trailer and no
  "Generated with" line.

## Scope

Build only what a user story's acceptance criteria require. Anything else is a backlog idea for the README, not code.

## Environments

- Development runs in a DevContainer.
- Production is the static web build (`npx expo export -p web` → `dist/`) on Vercel, configured in `vercel.json`; the
  course instructor deploys with Vercel. Docker with nginx (`Dockerfile`, `docker/nginx.conf`) runs the same build on
  a clean machine.
- expo-sqlite on the web needs every response to carry `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: credentialless`, and `.wasm` files to be served as `application/wasm`. `vercel.json`
  and `docker/nginx.conf` both set this, so a header or caching change goes in both files.
- Secrets come from environment variables only. `.env` files stay out of git, and every variable is listed in a
  committed `.env.example`. Gotcha: the `.env*` rule in `.gitignore` also matches `.env.example`, so committing it
  needs a `!.env.example` line.

## Code conventions

- **Never break the Android build.** Put web-only code in `*.web.ts` / `*.web.tsx` files or behind `Platform.OS`
  checks, so native code paths stay unchanged.
- **Desktop UI renders only on wide web screens.** Put it in `*.web.tsx` files or behind `Platform.OS === 'web'`
  checks, and in both cases also gate it on the wide breakpoint (≥1024px), so Android and compact web stay unchanged.
  [ADR 0001](docs/adr/0001-adapt-not-rebuild.md) records why the app is adapted rather than rebuilt.
- **Money is always stored in integer minor units** (cents for EUR, rupiah for IDR), parsed and formatted by
  `src/domain/money.ts`; never use floats for amounts. Currency conversion goes through `src/domain/fx.ts` (BigInt
  with one half-up rounding at the end). The only stored rate is EUR→IDR, as the integer `rate_micro`.
- **Layers:** pure logic lives in `src/domain/` (no React Native, no SQLite) and is tested in `__tests__/`. SQL lives
  only in `src/db/` and is tested by running the real SQL through the sql.js adapter in `test/sqljs-db.ts`.
- **A schema change is a new migration file** in `src/db/migrations/`, registered in its `index.ts`. Never edit a
  migration that has already shipped.
- **Every repository write calls `notifyDataChanged()`**, so the screens and the widget refresh.
- **The app uses one database connection**, from `src/db/DatabaseProvider.tsx`; get it with that file's
  `useSQLiteContext()`. Use `withTransactionAsync`: `withExclusiveTransactionAsync` throws on the web.
- **All UI text goes through `t()`** from `src/i18n`, with the key added to both `messages/en.ts` and
  `messages/id.ts`. A test fails on hard-coded strings or on keys missing from either language.
- **Colors come from theme tokens** through `useTheme()` (`src/theme/`). Text uses `<Txt>` and amounts use `<Money>`.
