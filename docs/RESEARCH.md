# BudgetApp Overhaul Research: Reference Apps, Multi-Currency, Feature Priorities & Visual Direction

The short answer: your overhaul plan (single-currency accounts, integer amounts, transfers that store both the sent and received amounts) already matches the best practice of the strongest multi-currency apps (Wallet by BudgetBakers, Bluecoins, Toshl, Lunch Money). The three things that most decide whether this app keeps being used or gets abandoned lie outside that plan: entering a transaction in under 5 seconds (including from the widget), showing separate EUR and IDR balances with a combined estimate as secondary info, and a visual identity that is actually chosen rather than a default dark mode.

## TL;DR
- **Multi-currency:** keep one currency per account. Show the EUR and IDR totals **separately** as the main figures, then a combined estimate in a "base currency" as a small line. Market rates (ECB via Frankfurter) are enough for estimates. Your real transfer rates (sent vs. received) are the source of truth for conversion costs.
- **Features that make people stay:** fast entry (custom keypad, 1-tap categories, templates/favourites, quick-add from the widget), daily reminders, monthly review. The main reason people stop using budget apps is *forgetting to log* and logging being too slow, not missing features.
- **Visual direction:** drop pitch black + neon accents. My recommendation is **"Buku Kas" (Indonesian for "cash ledger"; warm paper + bold tabular figures + distinctly Indonesian turmeric/indigo accents)** with an "ink" dark mode (not #000), plus a Material You option for users who want it.

---

## 1. Reference Apps: What Is Worth Copying

| App | Concept | What stands out | Multi-currency |
|---|---|---|---|
| **YNAB** | Zero-based / envelopes ("Give every dollar a job")\[1\] | Targets with coloured progress bars, the *Age of Money* metric\[2\]\[3\] | **None.** One currency per plan; YNAB itself suggests a separate plan per currency\[4\]\[5\] |
| **Monarch Money** | Tracking + net worth (US bank sync)\[6\] | Clean design, couples collaboration | **None.** Everything is shown with a "$" symbol without conversion; US/Canada only\[7\]\[8\] |
| **Copilot Money** | Tracking + AI categories (iOS only)\[9\] | Design considered the best in its category; its official FAQ: "Apple Design Award Finalist (2024) and Apple Editor's Choice in Personal Finance", also a Webby winner with a 4.8 App Store rating from 29,000+ reviews; local data so it feels responsive | Weak/not relevant (iOS, US) |
| **Wallet (BudgetBakers)** | Tracking + budget | Accounts, goals, planned payments\[10\] | **One currency per account (mandatory)**, rates updated automatically every night or entered manually. The default currency cannot be changed once set\[10\]\[11\] |
| **Spendee** | Wallet-based tracking | Clean visuals, shared wallets\[12\] | Currency per wallet, per-transaction rate can be set, overview in one "main currency". A wallet's currency is locked once it has transactions\[13\]\[14\] |
| **Toshl** | Tracking + budget (cheerful style, monsters) | The add-transaction screen doubles as a converter\[15\] | Most complete: hourly rates, daily historical rates, custom rates, rate options for recurring transactions\[15\]\[16\] |
| **Bluecoins** (Android) | Personal accounting (balance sheet)\[17\] | Transfers with fees, detailed reports\[18\] | Rates per account **and** per transaction, an *Effective Average Conversion Rate* (EACR) option\[19\]\[20\] |
| **Cashew** (open source, Flutter) | Tracking + flexible budgets\[21\] | Material You, customisable home screen, transaction title suggestions, search & filter, tags, subscriptions\[22\] | Multi-currency with automatic rates + net worth\[23\] |
| **Actual Budget** (open source) | Zero-based (envelopes), local-first | Free YNAB-style\[24\] | **Not yet** (its docs: "currency agnostic", the multi-currency feature is still experimental)\[25\]\[26\] |
| **Money Lover** (popular in ID) | Tracking + budget | Built-in calculator, travel mode\[27\]\[28\] | Currency per wallet. Transactions in another currency are automatically converted to the wallet's currency. A transfer with a fee creates 3 transactions\[29\]\[30\]\[31\] |
| **Money Manager (Realbyte)** (popular in ID) | Simple accounting | Calendar, calculator in the amount field, *bookmarks* for routine transactions\[32\]\[33\] | "Sub-currency" with a **manual** rate. Old transactions do not change when the rate is changed\[34\] |
| **Finku** (Indonesia) | Automatic tracking | Auto-sync of bank accounts/e-wallets, AI text/voice input\[35\]\[36\] | IDR-focused |

**The UX patterns most worth borrowing:**
- **A calculator in the amount field** (Money Lover, Money Manager): people often add up receipts in their heads, so `12,5+3,2` should be typeable directly.
- **Bookmarks/templates** (Money Manager), **automatic title suggestions** (Cashew): most of a student's transactions repeat (Carrefour, Crous, Navigo/Ilévia, transfers to parents).
- **Monthly calendar** (Money Manager): good for spotting "big-spending days".
- **The add-transaction screen as a converter** (Toshl): while typing EUR, also show the approximate IDR, and vice versa.\[15\]
- **A customisable home screen** (Cashew): Cashew's GitHub README lists "Customizable Home Screen: Tailor the home screen layout and widgets" and "App Links: Automatically create transactions with pre-filled data", a model that can be copied directly for quick-add via the `budgetapp://add` deep link.
- **Targets with coloured progress bars** (YNAB): for savings such as "a ticket home to Jakarta".\[2\]

## 2. Multi-Currency: Best Practices

**Data model.** Your plan is already right. Wallet by BudgetBakers even *deliberately* removed multi-currency accounts so that changing the base currency could work.\[37\] Spendee locks a wallet's currency as soon as it has transactions.\[14\] Additions needed:
1. **Store the rate at the transaction level, not in the report.** Bluecoins stresses that multi-currency works for transfers and mixed reports "because the rate is attached to the entry, not to the report".\[19\] For regular transactions store `fx_rate_to_base` + `fx_date`. For transfers, the implied rate = `received / sent`.
2. **Transfer fees as their own entity.** Money Lover and Bluecoins separate the fee from the transfer.\[18\]\[29\] From your data you can compute the *real conversion cost* = (market rate − implied rate) × amount + explicit fee. This is the most valuable insight for a student who regularly receives or sends money EUR↔IDR (Wise, bank transfers, etc.).
3. **Historical rates for old reports.** Lunch Money and Toshl use the rate on the transaction date.\[15\] For monthly budgets, Lunch Money uses the rate on the 1st of that month so budget figures stay stable.\[38\] This pattern is worth copying.

**How to show balances:**
- **Main figures split per currency** ("EUR 1.240,50" and "Rp 3.450.000"), because you *live* in two currencies and do not want the numbers to change just because the rate moves.
- **The combined estimate as a secondary line** ("≈ €1.437 total · ECB rate 30 Oct"), always with the "≈" sign and the rate date. Bluecoins users call the EACR option (value based on the average purchase rate vs. today's rate) important because the two answer different questions.\[39\]
- **Budgets per category per currency** (already in the plan) are more honest than a single converted budget. Add a "combined budget" option that uses the start-of-month rate.

**Rate source (offline-first):** **Frankfurter** (`api.frankfurter.dev`) is free, needs no API key, is open source, and serves the ECB reference rates. The ECB reference rates page states "The reference rates are usually updated at around 16:00 CET every working day, except on TARGET closing days". IDR is on the list (30 October 2026: EUR 1 = IDR 20275.17), and the ECB itself warns "Using the rates for transaction purposes is strongly discouraged", so it is suited to estimates, not as a replacement for your real transfer rates. Fetch once a day when online, store in a `fx_rates(date, base, quote, rate)` table, and use the latest rate when offline (Lunch Money also falls back to the nearest day).\[40\]

**Pitfalls to avoid:**
- **Different decimals:** IDR is practically without cents, EUR has 2 decimals. Store `minor_unit` per currency and do not hardcode ×100. Actual Budget's multi-currency PR tripped over exactly the "divide by 100 for every currency" assumption.\[26\]
- **Number format:** id-ID and fr-FR both use dots/spaces for thousands and commas for decimals, unlike en-US. Use `Intl.NumberFormat` with an explicit locale, and set the format once in settings.
- **Changing the base currency:** Toshl offers 3 options (historical rates/single rate/change the symbol only) and warns that custom rates can be lost.\[16\]\[41\] Store the original rates and *never* overwrite them when the base is changed.
- **Do not count transfers as expenses/income** (Bluecoins and Money Lover exclude them from reports).\[18\]\[29\]
- **Monarch as an anti-example:** it shows 10,000 CAD + 10,000 USD as "$20,000".\[7\]

**Who does it best?** For *tracking*: Toshl (the deepest) and Lunch Money (historical rates per transaction).\[42\] For an *account model* similar to your plan: Bluecoins (rates per account + per transaction + transfer fees) and Wallet.

## 3. Feature Priorities: What Makes People Stay

**Main finding from Reddit discussions (summarised by several app blogs):** the biggest complaint is not missing features but "I gave up because I forgot to log" and logging that is too slow or takes too many steps. Other complaints: expensive subscriptions and cloud apps that shut down or change direction.\[43\]\[44\] Since Intuit shut down Mint on 23 March 2024 and moved its users to Credit Karma (according to NerdWallet, "setting monthly budgets and customized categories didn't make the cut"), some users have deliberately chosen **manual** logging, because the act of logging is what creates spending awareness. *Source note: this summary comes from app vendor blogs (Vento, Hunter Vault) that have a vested interest, so treat it as an indication, not survey data.*

**Rated as high value:**
1. Very fast entry: custom keypad, 1-tap categories, last-used account as default.
2. Widget + quick-add from the home screen/notifications.
3. Recurring transactions & subscriptions (Cashew, Copilot, Money Lover highlight this).\[45\]\[46\]\[47\]
4. Alerts when a budget nears its limit (Finku, Sribuu, Cashew).\[35\]\[48\]\[49\]
5. Search, filter, tags.
6. Trustworthy backup (Cashew: automatic Google Drive).\[22\]\[50\]

**Often considered bloat for your context:** bank sync (unrealistic for BNI/BCA + French banks, and at odds with offline-first), AI chatbots, investments/crypto, excessive gamification, accounting reports (balance sheet/profit and loss).

**Features not yet in the plan that are worth adding:**
- **Quick-add from the widget and a persistent notification** (most important).
- **Templates/favourites** + title suggestions based on history.
- **A calculator in the amount field.**
- **Search + filter + tags** (e.g. #holiday, #campus).
- **Savings goals** (ticket home, apartment deposit/CAF).
- **A subscriptions view** (Spotify, Free Mobile, insurance) from recurring rules, with a monthly total per currency.
- **Monthly review** (a short screen on the 1st of every month: totals per currency, top 3 categories, this month's conversion cost, budgets met or not).
- **An optional daily reminder** ("Nothing logged today yet") via `expo-notifications`.
- **Receipt photo attachments**: low priority (increases backup size).

## 4. Visual Direction: Getting Away from "AI Slop"

**Traits of "AI slop" UI to avoid** (summarised from designer guides and open-source audit tools such as *avoid-ai-design* and *Hallmark*):\[51\]\[52\]
- Purple→blue/indigo gradients, gradient text, glowing blobs.\[52\]\[53\]
- **Reflexively permanent dark mode** with neon/glowing card borders.\[54\]
- Inter/Poppins/Geist everywhere with no deliberately chosen pairing.\[54\]
- Uniform corner radius on every element; nested cards; rows of "3 feature cards".\[51\]\[55\]\[56\]
- A 3–4 px colour stripe on the left side of cards.\[54\]
- Glassmorphism everywhere; emoji icons; generic thin line icons.\[52\]
- **Important warning:** "defaults that look tasteful" are now also considered slop, e.g. **cream + terracotta**, Instrument Serif/Fraunces/Space Grotesk, and an uppercase mono caption above every heading.\[52\]\[53\] The fix is not to avoid a list but to make **specific decisions for your context** and to use colour **semantically** (colour = meaning: EUR, IDR, expense, warning), not as decoration.\[53\]\[55\]

**Number typography.** In React Native, `fontVariant: ['tabular-nums']` is documented as a style prop without an iOS-only label,\[57\] but it only works if the font file has the OpenType `tnum` feature, so test on an Android device. Google fonts confirmed to have tabular figures: **IBM Plex Sans**, **Source Sans 3** (the most complete numeral features), Roboto, Noto Sans, and **JetBrains Mono** (monospace).\[58\]\[59\]\[60\] **DM Sans only has proportional figures**, so avoid it for number columns.\[61\] All are available via `@expo-google-fonts/*`.

### Option A: "Buku Kas" (recommended)
Concept: a paper passbook/cash ledger, editorial, with big numbers as the hero.
- **Light:** background `#F4F1EA` (paper, slightly cool so it does not become the cream-terracotta cliché), surface `#FBFAF6`, ink `#1C1B19`, rules `#D9D4C7`.
- **Dark:** background `#16181D` (blue-charcoal ink, **not** `#000`), surface `#1F232A`, text `#ECE8DF`.
- **Semantic accents:** EUR = indigo `#2E4A8B` (batik indigo), IDR = turmeric `#C98A0B`, expense = brick red `#B23A2E`, income = leaf green `#2F7D4F`.
- **Typography:** IBM Plex Sans (UI + `tnum` figures, weight 600–700 for large 40–56 pt balances), IBM Plex Mono for small currency codes (`EUR`, `IDR`) or the other way round. Avoid "trendy" serifs.
- **Composition:** the transaction list as *ruled rows* like a cash ledger (thin rules, no cards), grouped by date with daily subtotals. Cards only for 1–2 main elements. Small (4–8 px), consistent radius.
- **Charts:** a thin donut (thick stroke, no labels inside) with a table legend below it. The 6-month trend as simple two-colour bars (EUR/IDR) without gradients.
- **Pros:** the most distinctive, easy to read in daylight, fits the "logging" culture, easy to implement. **Cons:** needs typographic discipline; the dark mode needs to be designed separately so it does not feel "inverted".

### Option B: Material You (dynamic color)
- Colours are taken from the wallpaper (Android 12+), with a *seed color* fallback (e.g. `#2E4A8B`).\[62\]
- **Implementation on SDK 54:** `react-native-material-you-colors` (`getMaterialYouPalette`, `generatePaletteFromColor`). Reading the system palette only works in production/dev builds, not Expo Go.\[63\] From SDK 55, Expo Router provides `Color.android.dynamic.*`, and `@expo/ui` provides `useMaterialColors` (seedColor) in newer SDK versions, so it is relevant if you upgrade later.\[62\]\[64\]
- **Pros:** feels native to Android and personal, light/dark for free, and Cashew proves this approach is well liked; its GitHub README notes "Cashew was featured on Google Play's Editorial 'New Apps We Love' (November 2023)!" and "Cashew was featured in the Material You Apps List!". **Cons:** the app's identity follows the wallpaper; the EUR/IDR colours must stay static so their meaning is not lost.

### Option C: "Lille–Jakarta Postcard" (bold, characterful)
- Two worlds: Flanders blue-grey `#3B5368` + Lille brick `#A4483A` on one side, tropical teal-green `#1F7A6E` + turmeric `#D9A21B` on the other, on a warm white `#FAF8F4` / dark `#14171A` background.
- Simple flat illustrations (custom category icons styled like postmarks/stickers, not emoji), a balance header with large solid colour blocks, one block per currency.
- **Pros:** the most personal and memorable. **Cons:** needs custom illustration/icon assets and risks being busy; harder to keep consistent.

**Motion (all options):** balance figures "roll" when they change, a keypad with light haptics per tap, the add-transaction sheet appears with a short spring (< 250 ms), budget progress fills when the screen opens. Avoid continuous decorative animation.

## 5. Library Recommendations (Expo SDK 54 / RN 0.81)

| Need | Choice | Notes |
|---|---|---|
| Charts | **Stay with `react-native-gifted-charts`** | SVG-based, runs in Expo Go, enough for a donut + 6-month bars. Move to **Victory Native (XL, Skia)** only if you need gestures/scrubbing; it needs a dev build and the Skia/Reanimated versions must match the SDK\[65\]\[66\] |
| Bottom sheet | **`@gorhom/bottom-sheet` v5.2.x** | Compatible with Reanimated 4.1 + worklets on SDK 54, **as long as** `babel.config.js` uses `react-native-worklets/plugin` (not the old Reanimated plugin) and the app is wrapped in `GestureHandlerRootView`. Many "sheet won't open" reports after upgrading to SDK 54 come from this.\[67\]\[68\]\[69\] The `@expo/ui` BottomSheet (gorhom-compatible API, built on Jetpack Compose) only exists in newer SDKs\[70\]\[71\] |
| Animation | **Reanimated 4** (bundled with SDK 54) | For rolling numbers, progress, layout transitions |
| Haptics | **`expo-haptics`** | `selectionAsync` per keypad tap, `notificationAsync(Success)` on save |
| Number keypad | **Build your own** (a grid of `Pressable`) | Faster than the system keyboard; supports `+ − × ÷` operators, a `000` key, and a decimal separator that follows the currency (IDR without decimals) |
| Theme | Own tokens via Context + `useColorScheme` | Store semantic tokens (`bg`, `surface`, `ink`, `eur`, `idr`, `expense`), optionally a Material You palette |
| Fonts | `expo-font` + `@expo-google-fonts/ibm-plex-sans`, `/ibm-plex-mono` | Set `fontVariant: ['tabular-nums']` in the `<Money>` component |
| Widget | `react-native-android-widget` (already in use) | Add a button that opens the deep link `budgetapp://add?account=eur&category=makan` |
| Rates | `fetch` to Frankfurter + SQLite cache | Once a day, falling back to the latest rate |
| Notifications | `expo-notifications` | Daily reminder + quick-add action |

## Recommendation: Priority Changes to the Overhaul Plan

1. **(P0) Add-transaction screen in < 5 seconds:** bottom sheet + custom keypad with a calculator, 1-tap categories (the 6–8 most used), last account as the default, haptics, and an EUR↔IDR conversion preview (Toshl-style).
2. **(P0) Quick-add from the widget and notifications** via deep link; the widget shows this month's remaining budget per currency.
3. **(P0) FX model:** an `fx_rates` table (Frankfurter/ECB, daily cache), `minor_unit` per currency, a stored rate per transaction, transfer fees as a separate field/transaction, transfers excluded from reports.
4. **(P0) New visual system (Option A "Buku Kas")**: semantic colour tokens, IBM Plex Sans + tabular nums, ruled list without cards, charcoal `#16181D` dark mode. Drop the pitch black and neon accents.
5. **(P1) Home:** two big balances (EUR, IDR) + a "≈ total" line with the rate date → this month's budget progress → last 5 transactions. The order is customisable (Cashew-style).
6. **(P1) Templates/favourites + title suggestions**, **search + filter + tags**.
7. **(P1) Subscriptions view** from recurring rules + **optional daily reminder**.
8. **(P1) Monthly review** including "this month's conversion cost" (a differentiating feature most apps lack).
9. **(P2) Savings goals** with a progress bar (YNAB Targets-style).
10. **(P2) Material You theme option** (a toggle in settings), with the EUR/IDR colours kept static.
11. **(P3) Receipt photo attachments, monthly calendar.**

**Recommended visual direction:** Option A "Buku Kas", because it is the most distinctive for your context (a student "keeping the books" in two currencies), the cheapest to build in RN, and it directly answers the "AI slop" complaint: a paper/charcoal background (not black), bold tabular figures as the main element, colours that carry meaning (indigo = EUR, turmeric = IDR), and ruled rows instead of uniform rounded cards. Material You becomes a theme option, not the default.

## Caveats
- Many multi-currency comparisons (Tallyroot, Borderless Budget, Budgero, getfinny) are written by **competitors** selling multi-currency apps. The core facts have been checked against official documentation (Actual Budget, YNAB, Monarch via help-center quotes, Bluecoins, Wallet, Toshl, Lunch Money, Spendee, Money Lover, Realbyte), but the "best" rankings from those blogs should be read critically.
- Money Lover's rate source is not officially documented; Spendee's rate update frequency is also not currently confirmed on its official pages.
- Frankfurter's coverage is described differently by third parties (30-odd currencies). Its official homepage (frankfurter.dev) now says "a free exchange rates API for 228 currencies from 106 central banks and official sources… You don't need an API key", with ECB-only data at `/v2/providers/ecb/rates`. For EUR/IDR either is enough.
- The hex values and font pairings above are my design recommendations, not the result of quantitative research; test contrast (WCAG AA) and the `tnum` feature on real Android devices before locking them in.
- Library versions change quickly; check `npx expo install --check` for the versions that match SDK 54.

## Sources

1. [How to Use YNAB for Beginners: The Four Rules, Setup, and First-Month Workflow](https://themoneydecoded.com/blog/how-to-use-ynab-beginners)
2. [Goal Tracking](https://www.ynab.com/features/goal-tracking)
3. [Age of Money in YNAB](https://support.ynab.com/en_us/age-of-money-H1ZS84W1s)
4. [Does YNAB Support Multiple Currencies? Workarounds & Alternatives](https://budgero.app/blog/ynab-multi-currency)
5. [YNAB for Expats Review 2026: No Multi-Currency Budgets](https://borderlessbudget.com/blog/ynab-for-expats-review)
6. [Monarch Money Review: Honest Pros and Cons (2026)](https://pocketclear.app/blog/monarch-money-review-2026.html)
7. [Monarch Money Review 2026: US & Canada Only, USD](https://borderlessbudget.com/blog/monarch-money-review-expats)
8. [Best Multi-Currency Budgeting Apps, Ranked (2026)](https://borderlessbudget.com/blog/best-multi-currency-budgeting-apps)
9. [Copilot Money Review 2026](https://budgetingapps.org/apps/copilot/)
10. [Getting Started with Wallet - Wallet Help Center - BudgetBakers](https://support.budgetbakers.com/hc/en-us/articles/7151352625938-Getting-Started-with-Wallet)
11. [Multiple Currencies & Exchange Rates](https://support.budgetbakers.com/hc/en-us/articles/7149418777746-Multiple-Currencies-Exchange-Rates)
12. [Spendee Review 2026: Legit Budgeting App](https://millennialmoney.com/spendee-review/)
13. [How to Change Currency - Spendee Help Center](https://help.spendee.com/article/242-how-to-change-currency)
14. [How to set/change the currency and exchange rate? - Spendee Help Center](https://help.spendee.com/article/231-how-to-setchange-the-currency-and-exchange-rate)
15. [Toshl Finance - Personal finance, budget and expense tracker app](https://toshl.com/currencies/)
16. [Currencies in Toshl Finance](https://toshl.com/blog/currencies-in-toshl-finance-ounces-of-gold-welcome-ios/)
17. [Introduction to Bluecoins — Bluecoins guide](https://www.bluecoinsapp.com/guide/introduction/)
18. [Transactions — Bluecoins guide](https://www.bluecoinsapp.com/guide/transactions/)
19. [Multi-currency and exchange rates — Bluecoins guide](https://www.bluecoinsapp.com/guide/multi-currency/)
20. [Multi-Currency](https://www.bluecoinsapp.com/settings/multi-currency/)
21. [Cashew: Open-Source Budget & Expense Tracker](https://dev.co/databases/open-source/cashew)
22. [GitHub - jameskokoska/Cashew: 💸 An app created to help users manage a budget and purchases · GitHub](https://github.com/jameskokoska/Cashew)
23. [Cashew—Expense Budget Tracker - Apps on Google Play](https://play.google.com/store/apps/details?id=com.budget.tracker_app)
24. [Budget Software for Multiple Currencies (2026) — Tallyroot](https://tallyroot.com/blog/budget-software-multiple-currencies/)
25. [Multi-Currency](https://actualbudget.org/docs/budgeting/multi-currency/)
26. [\[WIP\] \[AI\] Add multi-currency support (do not merge: CI and CodeRabbit test) by rapastranac · Pull Request #9319 · actualbudget/actual · GitHub](https://github.com/actualbudget/actual/pull/9319)
27. [No.1 Expense Manager Budget Planner - Money Lover](https://moneylover.me/)
28. [Money Lover: Money Manager App - App Store](https://apps.apple.com/us/app/money-lover-money-manager/id486312413)
29. [Transfer money between wallets](https://moneylover.zendesk.com/hc/en-us/articles/900000358523-Transfer-money-between-wallets)
30. [Create, edit, archive and delete wallets](https://moneylover.zendesk.com/hc/en-us/articles/34974522779417-Create-edit-archive-and-delete-wallets)
31. [Create, edit and delete transactions](https://moneylover.zendesk.com/hc/en-us/articles/35483252404889-How-to-create-edit-and-delete-a-transaction)
32. [Money Manager (Remove Ads) - Apps on Google Play](https://play.google.com/store/apps/details?id=com.realbyteapps.moneya&hl=en_US)
33. [Money Manager Expense & Budget](https://apps.apple.com/app/560481810)
34. [How to add sub-currencies](https://help.realbyteapps.com/hc/en-us/articles/360042988234-How-to-add-sub-currencies)
35. [10+ Aplikasi Catatan Keuangan yang Aman dan Mudah (Terbaru)](https://www.nanovest.io/blog/tips-dan-tutorial/aplikasi-catatan-keuangan-22900/)
36. [Rekomendasi Aplikasi Pencatat Keuangan Harian Terbaik untuk Atur Finansial Sehari-hari](https://psimaluku.or.id/2026/06/13/rekomendasi-aplikasi-pencatat-keuangan-harian-terbaik-untuk-atur-finansial-sehari-hari/)
37. [Multiple currencies per account · Wallet/Board Feedback](https://feedback.budgetbakers.com/253)
38. [Show HN: Lunch Money, a personal budgeting tool with multi-currency support](https://news.ycombinator.com/item?id=20811287)
39. [Balance sheet and net worth — Bluecoins guide](https://www.bluecoinsapp.com/guide/balance-sheet/)
40. [Multicurrency](https://support.lunchmoney.app/settings/multicurrency)
41. [Currencies in Toshl Finance](https://toshl.com/blog/currencies-in-toshl-finance-ounces-of-gold-welcome-web-app/)
42. [Lunch Money Review 2026: Pricing, Pros and Alternatives](https://getfinny.app/blog/lunch-money-review-2026)
43. [Best Budget Expense Tracker App: What Reddit Actually Recommends (2026)](https://vento.money/blog/best-budget-expense-tracker-what-reddit-actually-says/)
44. [The Best Expense Tracker Apps, According to Reddit (2026)](https://huntervault.app/blog/best-expense-tracker-app-reddit/)
45. [Money Lover - Money Manager](https://play.google.com/store/apps/details?id=com.bookmark.money&hl=en_IN)
46. [I found the best open source expense manager on Android and I can't stop raving about it](https://www.androidpolice.com/best-open-source-expense-manager-on-android/)
47. [Copilot Money Review: Worth It Without Android? (2026)](https://pocketclear.app/blog/copilot-money-review-2026.html)
48. [Cashew for Android - Download the APK from Uptodown](https://cashew.en.uptodown.com/android)
49. [7 Aplikasi Pencatat Keuangan yang Gampang Digunakan](https://www.telkomsel.com/jelajah/jelajah-lifestyle/7-aplikasi-pencatat-keuangan-yang-gampang-digunakan)
50. [Download Cashew—Expense Budget Tracker APKs for Android - APKMirror](https://www.apkmirror.com/apk/dapper-app-developer/cashew-expense-budget-tracker/)
51. [Hallmark: Stop AI-Generated UI Slop in One Command in 2026 - DEV Community](https://dev.to/rams901/hallmark-stop-ai-generated-ui-slop-in-one-command-in-2026-3p9n)
52. [GitHub - funboy322/avoid-ai-design: Audits AI-generated frontend and rewrites it so it stops looking AI-made: purple-gradient slop and the "tasteful" defaults (cream + terracotta, mono chrome). Zero-dependency scanner included. The design counterpart to avoid-ai-writing. · GitHub](https://github.com/funboy322/avoid-ai-design)
53. [Is your website AI slop? How to tell, and how to fix it - DEV Community](https://dev.to/laurilllll/is-your-website-ai-slop-how-to-tell-and-how-to-fix-it-1fn5)
54. [AI Slop Design: Why AI-Generated UI Looks Generic (Fix Guide 2026)](https://vibecodekit.dev/ai-slop-design)
55. [Spot the Slop: A UI Designer’s Guide to Fixing AI Defaults](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)
56. [Spot the Slop: A UI Designer's Guide to Fixing AI Defaults · Mania Design](https://www.mania.design/blog/spot-the-slop-a-ui-designers-guide-to-fixing-ai-defaults/)
57. [Text Style Props · React Native](https://reactnative.dev/docs/text-style-props)
58. [The Best Fonts For Tables That You Should Be Using](https://wpdatatables.com/best-fonts-for-tables/)
59. [29 Best Free Architectural Drawing and Presentation Fonts](https://fontadvice.com/font-collections/architectural-drawing-and-presentation-fonts/)
60. [Best Fonts for Legible Numerals in UI Design](https://fontalternatives.com/blog/best-fonts-legible-numerals-ui/)
61. [Best Fonts for Dense Dashboards and Data-Heavy Interfaces](https://fontalternatives.com/blog/best-fonts-dense-dashboards/)
62. [Material Colors - Expo documentation](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/colors/)
63. [GitHub - alabsi91/react-native-material-you-colors: Bring Material You color palettes to Android, iOS, and web platforms. · GitHub](https://github.com/alabsi91/react-native-material-you-colors)
64. [Expo SDK 55, Portal in React Native, and Your Grandma’s Gesture Library](https://thereactnativerewind.com/issues/expo-sdk-55-portal-in-react-native-and-your-grandmas-gesture-library)
65. [React Native Charts: Which Library, and How](https://www.shipnative.dev/blog/react-native-charts)
66. [Victory Native Charts Tutorial 2026](https://reactnativerelay.com/article/react-native-charts-victory-native-interactive-data-visualizations-expo)
67. [@gorhom/bottom-sheet stopped opening after upgrading to Expo SDK 54 + Reanimated 4 + react-native-worklets · expo/expo · Discussion #48046 · GitHub](https://github.com/expo/expo/discussions/48046)
68. [gorhom.dev](https://gorhom.dev/react-native-bottom-sheet/v4)
69. [\[Bug\]: Bottom sheet won't open after upgrading to reanimated v4/expo 54 · Issue #2528 · gorhom/react-native-bottom-sheet · GitHub](https://github.com/gorhom/react-native-bottom-sheet/issues/2528)
70. [BottomSheet - Expo documentation](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/bottomsheet/)
71. [docs.expo.dev](https://docs.expo.dev/versions/v56.0.0/sdk/ui/drop-in-replacements/bottomsheet.md)
