# Rupiero on Desktop: Adapt the Expo App, Don't Rebuild (8-Day Plan)

Adapt the existing Expo/React Native Web app. Don't build a separate Vite/shadcn frontend. In 8 days you can realistically get a convincing desktop layout by changing the app *shell*, not the app: load the fonts, add a breakpoint hook, put a sidebar on wide screens, use a 2-column dashboard grid, add a header "Add transaction" button and turn quick-add into a centered modal. All of this goes in `.web.tsx` files or width guards, so Android stays untouched. A rebuild would mean redoing every screen, the wa-sqlite data wiring, i18n, charts and the calculator in a second codebase. That is too much risk for a course that grades process more than polish.

## TL;DR
- **Recommendation: adapt (option A).** Use hand-rolled breakpoints with `useWindowDimensions` and your existing theme tokens, React Navigation 7's drawer with `drawerType: 'permanent'` on wide web screens, and a web-only centered modal that replaces `@gorhom/bottom-sheet`. Bluesky's Expo 54 / RN 0.81 / React Navigation 7 app proves the pattern works in production. Don't add Tamagui, NativeWind or Unistyles this late.
- **Biggest visual wins first:** (1) load IBM Plex on web and use tabular numbers with smaller money sizes; (2) wider max-width plus a 2-column dashboard at ≥1024px; (3) a permanent left sidebar instead of stacked "All transactions >" rows; (4) a header "+ Add transaction" button and an `N` shortcut instead of the FAB; (5) quick-add as a centered modal.
- **Plan:** shell and fonts (days 1–2), dashboard and modal (days 3–4), tables, hover and focus (day 5), tests and Android regression check (day 6), Vercel/Docker headers and README (day 7), freeze and rehearse (day 8). Present the adapt-vs-rebuild decision as a documented ADR in your AI-workflow story.

## Key Findings

### 1. The pattern you need is proven on the exact same stack
- **Bluesky's social app** is the best reference case. Its own CLAUDE.md lists "React Native 0.81 with Expo 54", "React Navigation 7 for routing", and a custom design system with platform helpers such as `web({cursor: 'pointer'})`. Its dialogs are a "Bottom sheet on native, modal on web", and menus are a "Dropdown on web, bottom sheet dialog on native", implemented through `Component.web.tsx` / `Component.native.tsx` file splits. On web it renders a left nav plus a centered column instead of tabs.
- The lesson from Bluesky: **one shared component API with a platform-specific implementation**, not one component full of `if (web)` branches. Rupiero already follows this convention with `.web.ts`, so it scales cleanly.
- Two open-source Expo/finance projects describe the same "phone app scaled up" problem you have, and list the same fix. One finance-tracker issue asks for "a sidebar (or top bar) on wide windows instead of the floating bottom tab bar… so the routes stay the same", "two or more columns where a screen has independent sections", and "hover states on rows and buttons, keyboard focus styles, and a pointer cursor". Another Expo project uses breakpoints "sm 480, md 768, lg 1024, xl 1280", where "the wide (desktop) layout starts at 1024px". A budgeting app's desktop PR switches to a sidebar "from 1000px wide" containing "+ Add transaction", and collapses it to icons between 1000 and 1199px so tables keep room.

### 2. Tooling verdict: hand-rolled breakpoints, no new styling library
| Option | Compatibility with your stack (Expo 54, Reanimated 4, static web export) | Verdict for an 8-day deadline |
|---|---|---|
| `useWindowDimensions` + theme tokens (hand-rolled) | Built into RN/RNW; React Navigation's own docs use it for responsive drawers | **Use this** |
| Unistyles 3 | The npm page (3.7.0) lists RN 0.81+ / Expo SDK 54+, but "development builds only, Expo Go is not supported" and it needs Nitro modules; the current docs and a recent PR raise the minimum to RN 0.85 / Expo SDK 56 | Version churn plus native setup. Avoid |
| NativeWind v4 | Expo's SDK 54 upgrade guide said "If you use Nativewind, you will want to stay on Reanimated v3 for now", and the SDK 54 beta changelog was stronger: "if you use Nativewind then you will need to remain on Reanimated v3 because it does not yet support v4"; NativeWind maintainer Dan Stepanov later wrote in GitHub Discussion #1529 (Sep 29, 2025) that "Nativewind v4 and v5 both support react-native-reanimated v4", and a community guide says "NativeWind v4.2.0+ is required for Expo SDK 54 with Reanimated v4 compatibility" | Rewriting every style to `className` in a week is a big diff with setup risk. Avoid |
| Tamagui | Full design-system replacement | Far too invasive now. Avoid |

Adding a styling library this late buys you nothing that a 30-line `useBreakpoint()` hook can't do. It also adds Babel/Metro configuration risk to the Android build you must protect.

### 3. React Navigation 7: permanent drawer is the official sidebar mechanism
- The 7.x drawer docs: "permanent: A permanent drawer is shown as a sidebar. Useful for having always visible drawer on larger screens." The official example switches on width: `drawerType: dimensions.width >= 768 ? 'permanent' : 'front'`.
- On web, React Navigation renders **real anchor tags** for drawer items when linking is configured, so sidebar items behave like normal links (middle-click, URL bar).
- The drawer layout uses "CSS transitions on Web" rather than Reanimated, so Reanimated 4 isn't a risk on web here.
- **Known pitfall:** issue #8551 ("Drawer layout breaks on web when increasing window width") left a stuck `translateX` when switching from a non-permanent drawer to a permanent one. Maintainer satya164 closed it with the commit "fix: add a workaround for safe area frame not updating on web". That fix followed PR #11398, which found the drawer "is using useSafeAreaFrame and that it wasn't updating dimensions upon window resize". A 2025 commenter still recommends wrapping the app in an explicit `<SafeAreaProvider>`. Test resizing the browser in both directions before the demo.

### 4. `@gorhom/bottom-sheet` on web: works, but it's a mobile metaphor with open web bugs
- v5 added web support, but the author describes the goal as letting users "use the library in web mobile without changing the API". It's a phone pattern, not a desktop one.
- There are open v5 web issues, notably #2278 "[Bug]: Web compatibility broken in >= 5.0.6" (opened May 6, 2025, 11 comments, still open), and #1910/#2409, where the sheet reopens by itself after navigating back on web.
- **Decision:** on web, don't render the bottom sheet at all. Create `QuickAddSheet.web.tsx`, a centered modal at roughly 440–480px wide with a backdrop that closes on Esc and click-outside. It reuses the same form, calculator keypad and save logic. React Native Web ships a `Modal` built "using CSS animations and ARIA" that hides the rest of the app from screen readers while open. This is exactly Bluesky's "bottom sheet on native, modal on web" split.

### 5. Desktop interaction details are cheap in RNW
- RNW `Pressable` exposes `hovered`, `focused` and `pressed` to function styles ("The hover state is only activated by mouse interactions"). Its source also sets `cursor: 'pointer'` for pressables. One `<Row>`/`<Button>` primitive with hover background and a focus ring covers the whole app.
- Minor caveat: RNW issue #1849 notes that `focused` styles also trigger on mouse focus. Prefer a subtle ring or use `:focus-visible` via a web-only stylesheet.

### 6. How finance web apps lay out desktop
| App | Desktop layout signal | Add-transaction pattern | What to borrow |
|---|---|---|---|
| Monarch Money | Widget dashboard (budget, net worth, spending trend, transactions, recurring); "Customize" button top-right; web and mobile layouts are customized separately | n/a (mostly bank-synced) | Card grid; **different layout on web and mobile is normal** |
| Copilot Money (web launched Dec 15, 2025: "Copilot for Web is here!") | Dashboard = spending, income, recent transactions, monthly progress, upcoming recurrings, trending budget categories | Keyboard shortcuts on transactions: X select, R reviewed, C category | Summary first, drill down on demand |
| Lunch Money | Explicitly "web-first because budgeting deserves a full screen" | "Add to cash" button above the table creates **an inline new row**; Enter saves | Table-centric transactions page |
| Actual Budget | Sidebar + tri-column budget table (budgeted / spent / balance); "To Budget" at top | Actual's Tips & Tricks docs: "T Add new transaction with date picker open"; "Ctrl Enter will add the transaction and close the form regardless of where you are editing" (shipped in Release 25.12.0, #6037); Ctrl/Cmd+K command palette | Keyboard-first entry |
| YNAB | "Ready to Assign" at top of the plan, right-hand sidebar with details when nothing is selected | n/a | One headline number at top, details on the right |

What these share: a **persistent left nav**, **one row of headline KPI numbers**, **a budget/progress panel**, **recent transactions as a compact list or table**, and **a visible primary "add" action plus a keyboard shortcut**, never a floating FAB. Money typography is restrained. Headline numbers are large but medium weight, and table amounts are body-size with tabular (fixed-width) digits so columns align.

## Proposed desktop layout for Rupiero (≥1024px)

```
┌────────────┬──────────────────────────────────────────────────────────────┐
│ ◆ Rupiero  │  November 2026   ‹ ›         [👁]   [ + Add transaction  N ]  │
│            ├──────────────────────────────────────────────────────────────┤
│ ▣ Dashboard│ ┌─ EUR balance ─────┐ ┌─ IDR balance ─────┐ ┌─ Total (EUR) ──┐│
│ ≡ Transact.│ │ € 1 234,56        │ │ Rp 4 560 000      │ │ € 1 498,10     ││
│ ◔ Budget   │ │ 2 accounts        │ │ 1 account         │ │ ECB 05 Nov ⓘ   ││
│ ▤ Charts   │ └───────────────────┘ └───────────────────┘ └────────────────┘│
│            │ ┌─ Cash flow this month ───────────┐ ┌─ Budgets ─────────────┐│
│            │ │ EUR  in +900  out −640  net +260 │ │ Groceries ████░░ 72%  ││
│            │ │ IDR  in +2.0M out −1.1M net +0.9M│ │ Transport ██░░░░ 35%  ││
│            │ └──────────────────────────────────┘ │ Fun       ██████ 104% ││
│            │ ┌─ Recent transactions ─── View all→┐│ …  Manage budgets →   ││
│            │ │ 04 Nov  Carrefour  Groceries −23,40€││                       ││
│ ⚙ Settings │ │ 03 Nov  Gojek      Transport −45k Rp│└───────────────────────┘│
│ v1.x · EN  │ └───────────────────────────────────┘                          │
└────────────┴──────────────────────────────────────────────────────────────┘
```

- **Sidebar (220–240px, permanent ≥1024px):** Dashboard / Transactions / Budget / Charts, with Settings pinned at the bottom. Below 1024px on web and on Android, keep today's mobile UI unchanged.
- **Header:** month switcher, privacy eye, and a primary **"+ Add transaction"** button with an `N` hint. Remove the FAB on wide web.
- **Main content:** max-width about 1200–1280px, centered within the area to the right of the sidebar, with a 24px gutter.
  - Row 1: three KPI cards. On desktop they don't need to be giant; about 28–32px medium weight is enough.
  - Row 2: a 2:1 grid with cash flow plus recent transactions (last 5–8, with a "View all →" link) on the left and the budget panel on the right. The budget section was below the fold; on desktop it moves into view.
- **Quick-add:** a centered modal (~460px) with the same calculator keypad. Physical keyboard input already works; add Enter to save and Esc to close.
- **Transactions page (wide):** a real table with Date | Description | Category | Account | Amount (right-aligned, tabular digits), plus hover rows. Clicking a row opens the existing edit UI in the modal.

## Adapt vs. rebuild: the decision

| Criterion | (A) Adapt Expo app (recommended) | (B) Separate Vite + shadcn/Mantine web app | (C) Cheap alternatives |
|---|---|---|---|
| Effort (with Claude Code) | ~4–5 dev days for shell, dashboard, modal, tables and tests | ~7–12 days: every screen, data layer (wa-sqlite/OPFS, migrations, worker), i18n, charts, calculator, settings, Docker/Vercel again | Phone-frame mock: ~0.5 day; Expo Router migration: several days |
| Risk to deadline | Low–medium, changes are incremental and shippable each day | High, nothing demoable until most screens exist | Phone frame is low risk but doesn't solve the problem |
| Code duplication | None in domain/db; small `.web.tsx` UI forks | All UI duplicated; two i18n/theme systems to keep in sync | n/a |
| Android | Untouched if you follow the `.web.tsx`/guard rule | Untouched | Untouched |
| Demo impact | Same app on phone and laptop, each with the right layout | Could look slicker, *if* finished | Looks like a workaround |
| AI-workflow story | Strong: ADR, user stories, small PRs, tests per breakpoint | Mixed: "rewrote it in a week" invites questions on testing and duplication | Weak |

Your 330 Jest tests and `src/domain` (integer minor units, BigInt FX) would carry over to a rebuild. What wouldn't carry over is the expensive part: the UI, navigation and the wa-sqlite persistence wiring that already works on web. Option B is a valid *post-course* idea if the web ever becomes the main product, the way Lunch Money is web-first. For 13 November it's the wrong trade.

## Day-by-day plan (Thu 5 Nov → demo Fri 13 Nov)

**Day 1 (Thu 5): Foundations (biggest visual change per hour)**
- Load IBM Plex on web with `expo-font`'s `useFonts`. It works on web, while the config-plugin method doesn't support web. Bundle the files locally (or use `@expo-google-fonts/ibm-plex-*`) rather than a CDN, because your COEP header for SQLite can block cross-origin assets.
- Add `src/ui/layout/useBreakpoint.ts` with `compact <768`, `medium 768–1023`, `wide ≥1024`, `xl ≥1280`, plus `layout.maxWidth.content` / `layout.sidebarWidth` tokens in your theme.
- In `<Money>`, add size variants (`hero`, `card`, `row`) and tabular digits (`fontVariant: ['tabular-nums']`).
- Commit an ADR: "Adapt vs rebuild for desktop web".

**Day 2 (Fri 6): Navigation shell**
- Add `@react-navigation/drawer`. Its native dependencies, gesture-handler and Reanimated, are already in the project.
- In `RootNavigator.web.tsx`, use a drawer with `drawerType: isWide ? 'permanent' : 'front'`, a custom `drawerContent` (logo, items, Settings at the bottom), and `headerShown` replaced by your own `DesktopHeader`. Leave the Android navigator file as it is.
- Add a `linking` config so each section has a URL (`/`, `/transactions`, `/budget`, `/charts`, `/settings`). Add the Vercel SPA rewrite.
- Test resizing across 1024px in both directions (issue #8551) with `SafeAreaProvider` at the root.

**Day 3 (Sat 7): Dashboard grid**
- `DashboardScreen` chooses its layout from `useBreakpoint()`. Compact keeps the existing stacked layout; wide uses the KPI row plus the 2:1 grid with flexbox (`flexDirection: 'row'`, `flexWrap`, `gap`).
- Replace the "All transactions >" / "Spending charts >" rows on wide screens with an embedded recent-transactions card and the budget panel. The sidebar handles navigation.

**Day 4 (Sun 8): Quick-add modal + header button**
- Write `QuickAddSheet.web.tsx` with the same props and API as the native sheet, rendering RN `Modal transparent` with a centered card, Esc to close, and focus on the amount field.
- On wide screens, hide the FAB and show "+ Add transaction" in `DesktopHeader`. Add a global `N` shortcut in a `.web.ts` hook that ignores key presses while an input is focused.

**Day 5 (Mon 9): Tables and desktop polish**
- On wide screens, the Transactions screen becomes a table with a header row, right-aligned amounts and hover rows.
- Build Budget and Charts in 2-column wide layouts.
- Add a shared `PressableRow`/`Button` with `hovered`/`focused` styles, and thin scrollbars via a small web-only global CSS injection. Scroll only the main area, not the sidebar.

**Day 6 (Tue 10): Tests and Android check**
- Unit-test `useBreakpoint` thresholds.
- Render-test the dashboard at 390px and 1440px by mocking `useWindowDimensions` with `jest.spyOn`. Assert that the FAB exists on compact and the header button exists on wide.
- Run the full 330+ suite and an Android build/smoke test (EAS or a local APK). Optionally add one Playwright screenshot at 1440px for the README.

**Day 7 (Wed 11): Deploy and docs**
- Vercel: add `vercel.json` with the COOP/COEP headers for all routes and an SPA rewrite to `/index.html`. Mirror both in nginx (`add_header` plus `try_files $uri /index.html`).
- README: desktop and mobile screenshots, breakpoint table, ADR link, and a section on how Claude Code was used (prompts, PRs, tests).

**Day 8 (Thu 12): Freeze**
- Bug fixes only. Rehearse the demo on the real deployed URL and also on a phone or narrow window to show the same codebase adapting.

**Backlog (explicitly out of scope):** command palette (Ctrl/Cmd+K), inline add-row in the transactions table, collapsible icon-only sidebar for 1024–1199px, dashboard customization, column sorting/filtering, tablet-specific layout, migrating styles to a library.

## Implementation notes (Expo SDK 54 / RNW / React Navigation 7)

- **Breakpoint hook:** `const { width } = useWindowDimensions(); return width >= 1280 ? 'xl' : width >= 1024 ? 'wide' : width >= 768 ? 'medium' : 'compact';`. Gate desktop UI with `Platform.OS === 'web' && bp !== 'compact'`, so a landscape Android tablet doesn't accidentally get half-built desktop UI.
- **Containers:** wrap screen bodies in `<PageContainer>` with `{ width: '100%', maxWidth: tokens.layout.maxWidth.content, alignSelf: 'center', paddingHorizontal: 24 }`.
- **Grid:** use a row with `gap: 16` and children with `flex: 2` / `flex: 1`. For the KPI row, three `flex: 1` cards with `minWidth: 220` and `flexWrap: 'wrap'`.
- **Platform forks:** keep the rule "web-only code in `.web.tsx` or behind guards" in your CLAUDE.md so the agent applies it consistently. Bluesky's CLAUDE.md is a good model for documenting platform footguns.
- **Money typography:** desktop hero 28–32px with `fontWeight: '500'`; card secondary 14px; table 14–15px; always tabular digits; amounts right-aligned in tables. The current giant serif numbers are largely the Times fallback, so loading Plex fixes most of the look.
- **SQLite on web:** expo-sqlite's docs say web hosting needs the `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers (Expo's example uses `credentialless` + `same-origin`). Without them you get `SharedArrayBuffer is not defined`. Verify both on the Vercel preview, not just locally.
- **Navigation on Android:** don't introduce the drawer into the native navigator. Platform-split the root navigator file so Android's stack and gesture behaviour stays byte-for-byte the same.

## Caveats
- Effort estimates are judgment calls for an experienced React/TS developer working with Claude Code, not measured data. Day 5 is the first thing to cut if days 1–4 slip.
- I couldn't verify the root cause of gorhom issue #2278 (only its title and open status). The recommendation to skip the sheet on web doesn't depend on it.
- Unistyles' compatibility statements conflict across its npm page (Expo 54+) and current docs (Expo 56+). Either way, it's not worth adopting now.
- Competitor descriptions come from vendor help pages and reviews, not hands-on audits. The Penny Hoarder's 2026 review calls Copilot's web app "a more limited web version", and EnvelopeBudgeting.com notes that as of March 2026 it still lacked features like Goals, Cash Flow and split transactions.

## Ringkasan (Bahasa Indonesia)
Rekomendasi: **adaptasi aplikasi Expo yang sudah ada, jangan bangun ulang frontend web terpisah.** Dalam 8 hari, prioritaskan: (1) memuat font IBM Plex di web dan memperkecil angka uang dengan digit tabular; (2) hook breakpoint dan kontainer max-width; (3) sidebar permanen (drawer React Navigation 7, hanya di file `.web.tsx`); (4) dashboard 2 kolom: kartu saldo EUR, IDR dan total, arus kas, anggaran, transaksi terbaru; (5) tombol "+ Add transaction" di header dan quick-add sebagai modal di tengah layar, menggantikan bottom sheet. Android tetap aman karena semua kode web dipisah. Hari terakhir dipakai untuk tes, deploy Vercel dengan header COOP/COEP, README, dan latihan demo.
