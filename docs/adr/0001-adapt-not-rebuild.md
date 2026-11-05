---
status: accepted
date: 2026-11-05
---

# 0001. Adapt the Expo app for desktop web instead of rebuilding it

## Context

Human testing on a laptop showed that the web build is the phone app stretched to a wider screen: one narrow column,
a floating add button, quick-add as a bottom sheet, and navigation through stacked "All transactions ›" rows. The
course demo runs in the browser on 13 November 2026, eight days away. Rupiero is a single Expo SDK 54 / React Native
Web codebase that also ships on Android. On the web, its data lives in wa-sqlite in OPFS, and the static build is
deployed on Vercel. The evidence for the options below is in
[desktop-web-research.md](../desktop-web-research.md).

## Options

- **A. Adapt the Expo app.** Change only the web shell for wide screens: breakpoints, a permanent sidebar, a
  multi-column dashboard, a header "Add transaction" button and a centered quick-add modal. Domain logic, the
  database, i18n and the screens stay shared.
- **B. Build a separate web frontend** (Vite with shadcn or Mantine). It could look more like a desktop app. But every
  screen would be written a second time, along with the wa-sqlite/OPFS data layer and its migrations, i18n, charts,
  the calculator and the deployment, and nothing would be demoable until most of it existed. The estimate is 7–12
  days, against 8 available.
- **C. A cheap workaround.** Show the phone UI inside a phone frame on desktop (half a day, but it doesn't fix the
  problem), or migrate to Expo Router first (several days with no visible change).

## Decision

Option A. Desktop UI lives in `*.web.tsx` files or behind `Platform.OS === 'web'` checks, and it renders only at the
wide breakpoint (window width ≥1024px). Android and narrower web windows keep today's UI. Breakpoints come from a
small hook on `useWindowDimensions` plus the existing theme tokens. No styling library is added (Tamagui, NativeWind,
Unistyles), so the Android build's Babel and Metro setup stays as it is.

## Consequences

- Each change ships on its own, so the demo improves day by day and work can stop at any point with a working app.
- Domain logic, SQL and their tests stay in one place. The web-only forks are small UI files.
- Wide web and Android layouts diverge, so some UI changes need two implementations. Wide layouts need their own
  tests (breakpoint thresholds, render tests at phone and desktop widths), and Android needs a regression check
  before the demo.
- On wide web, quick-add moves from `@gorhom/bottom-sheet` (which has open web bugs) to a centered modal. The modal
  must keep the same keypad, physical keyboard input and save logic as the sheet.
- A separate web-first frontend (option B) remains an idea for after the course, if the web becomes the main product.
