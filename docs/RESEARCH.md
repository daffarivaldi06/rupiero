# Riset Overhaul BudgetApp: Referensi Aplikasi, Multi-Mata Uang, Prioritas Fitur & Arah Visual

Inti jawabannya: rencana overhaul Anda (akun bermata uang tunggal, nilai integer, transfer yang menyimpan jumlah kirim dan terima) sudah sama dengan praktik terbaik aplikasi multi-mata uang terkuat (Wallet by BudgetBakers, Bluecoins, Toshl, Lunch Money). Tiga hal yang paling menentukan aplikasi ini dipakai terus atau ditinggal ada di luar rencana itu: input transaksi kurang dari 5 detik (termasuk dari widget), tampilan saldo EUR dan IDR terpisah dengan estimasi gabungan sebagai info sekunder, dan identitas visual yang benar-benar dipilih, bukan dark mode bawaan.

## TL;DR
- **Multi-mata uang:** pertahankan satu mata uang per akun. Tampilkan total EUR dan IDR **terpisah** sebagai angka utama, lalu estimasi gabungan dalam "mata uang dasar" sebagai baris kecil. Kurs pasar (ECB via Frankfurter) cukup untuk estimasi. Kurs transfer nyata Anda (kirim vs. terima) adalah sumber kebenaran untuk biaya konversi.
- **Fitur yang membuat orang bertahan:** input cepat (keypad sendiri, kategori 1 tap, template/favorit, quick-add dari widget), pengingat harian, review bulanan. Alasan utama orang berhenti pakai app budget adalah *lupa mencatat* dan proses mencatat yang terlalu lambat, bukan kurang fitur.
- **Arah visual:** tinggalkan hitam pekat + aksen neon. Rekomendasi saya **"Buku Kas" (kertas hangat + angka tebal tabular + aksen kunyit/indigo khas Indonesia)** dengan mode gelap "tinta" (bukan #000), plus opsi Material You untuk pengguna yang mau.

---

## 1. Aplikasi Referensi: Apa yang Layak Ditiru

| Aplikasi | Konsep | Yang menonjol | Multi-mata uang |
|---|---|---|---|
| **YNAB** | Zero-based / amplop ("Give every dollar a job")\[1\] | Targets dengan progress bar berwarna, metrik *Age of Money*\[2\]\[3\] | **Tidak ada.** Satu currency per plan; YNAB sendiri menyarankan plan terpisah per mata uang\[4\]\[5\] |
| **Monarch Money** | Tracking + net worth (bank sync AS)\[6\] | Desain bersih, kolaborasi pasangan | **Tidak ada.** Semua ditampilkan dengan simbol "$" tanpa konversi; hanya AS/Kanada\[7\]\[8\] |
| **Copilot Money** | Tracking + kategori AI (iOS saja)\[9\] | Desain dianggap terbaik di kategorinya; FAQ resminya: "Apple Design Award Finalist (2024) and Apple Editor's Choice in Personal Finance", juga pemenang Webby dengan rating App Store 4,8 dari 29.000+ ulasan; data lokal sehingga responsif | Lemah/tidak relevan (iOS, AS) |
| **Wallet (BudgetBakers)** | Tracking + budget | Akun, goals, planned payments\[10\] | **Satu mata uang per akun (wajib)**, kurs diperbarui otomatis tiap malam atau diisi manual. Mata uang default tidak bisa diganti setelah diset\[10\]\[11\] |
| **Spendee** | Tracking berbasis wallet | Visual bersih, shared wallet\[12\] | Mata uang per wallet, kurs per transaksi bisa diatur, overview dalam satu "main currency". Mata uang wallet terkunci setelah ada transaksi\[13\]\[14\] |
| **Toshl** | Tracking + budget (gaya ceria, monster) | Layar tambah transaksi sekaligus jadi konverter\[15\] | Paling lengkap: kurs per jam, kurs historis harian, kurs kustom, opsi kurs untuk transaksi berulang\[15\]\[16\] |
| **Bluecoins** (Android) | Akuntansi pribadi (neraca)\[17\] | Transfer dengan biaya, laporan detail\[18\] | Kurs per akun **dan** per transaksi, opsi *Effective Average Conversion Rate* (EACR)\[19\]\[20\] |
| **Cashew** (open source, Flutter) | Tracking + budget fleksibel\[21\] | Material You, home screen bisa diatur, saran judul transaksi, search & filter, tag, langganan\[22\] | Multi-mata uang dengan kurs otomatis + net worth\[23\] |
| **Actual Budget** (open source) | Zero-based (amplop), local-first | Gaya YNAB gratis\[24\] | **Belum ada** (dokumentasinya: "currency agnostic", fitur multi-currency masih eksperimental)\[25\]\[26\] |
| **Money Lover** (populer di ID) | Tracking + budget | Kalkulator bawaan, travel mode\[27\]\[28\] | Mata uang per wallet. Transaksi dalam mata uang lain dikonversi otomatis ke mata uang wallet. Transfer dengan biaya membuat 3 transaksi\[29\]\[30\]\[31\] |
| **Money Manager (Realbyte)** (populer di ID) | Akuntansi sederhana | Kalender, kalkulator di field jumlah, *bookmark* untuk transaksi rutin\[32\]\[33\] | "Sub-currency" dengan kurs **manual**. Transaksi lama tidak berubah saat kurs diubah\[34\] |
| **Finku** (Indonesia) | Tracking otomatis | Auto-sync rekening/e-wallet, input AI teks/suara\[35\]\[36\] | Fokus IDR |

**Pola UX yang paling layak dipinjam:**
- **Kalkulator di field jumlah** (Money Lover, Money Manager): orang sering menjumlah struk di kepala, jadi `12,5+3,2` harus bisa langsung diketik.
- **Bookmark/template** (Money Manager), **saran judul otomatis** (Cashew): kebanyakan transaksi mahasiswa berulang (Carrefour, Crous, Navigo/Ilévia, transfer ke orang tua).
- **Kalender bulanan** (Money Manager): cocok untuk melihat "hari boros".
- **Layar tambah transaksi sebagai konverter** (Toshl): saat mengetik EUR, tampilkan juga perkiraan IDR, dan sebaliknya.\[15\]
- **Home screen yang bisa diatur** (Cashew): README GitHub Cashew mencantumkan "Customizable Home Screen: Tailor the home screen layout and widgets" serta "App Links: Automatically create transactions with pre-filled data", model yang bisa langsung ditiru untuk quick-add via deep link `budgetapp://add`.
- **Target dengan progress bar berwarna** (YNAB): untuk tabungan seperti "tiket pulang Jakarta".\[2\]

## 2. Multi-Mata Uang: Praktik Terbaik

**Model data.** Rencana Anda sudah benar. Wallet by BudgetBakers bahkan *sengaja* menghapus akun multi-mata-uang supaya fitur ganti mata uang dasar bisa jalan.\[37\] Spendee mengunci mata uang wallet begitu ada transaksi.\[14\] Tambahan yang perlu:
1. **Simpan kurs di level transaksi, bukan di laporan.** Bluecoins menegaskan multi-currency berjalan untuk transfer dan laporan campuran "because the rate is attached to the entry, not to the report".\[19\] Untuk transaksi biasa simpan `fx_rate_to_base` + `fx_date`. Untuk transfer, kurs implisit = `received / sent`.
2. **Biaya transfer sebagai entitas sendiri.** Money Lover dan Bluecoins memisahkan fee dari transfer.\[18\]\[29\] Dari data Anda bisa dihitung *biaya konversi nyata* = (kurs pasar − kurs implisit) × jumlah + fee eksplisit. Ini insight paling berharga untuk mahasiswa yang rutin menerima atau mengirim uang EUR↔IDR (Wise, transfer bank, dsb.).
3. **Kurs historis untuk laporan lama.** Lunch Money dan Toshl memakai kurs pada tanggal transaksi.\[15\] Untuk budget bulanan, Lunch Money memakai kurs tanggal 1 bulan itu supaya angka budget stabil.\[38\] Pola ini bagus ditiru.

**Cara menampilkan saldo:**
- **Angka utama dipisah per mata uang** ("EUR 1.240,50" dan "Rp 3.450.000"), karena Anda *hidup* dalam dua mata uang dan tidak ingin angka berubah hanya karena kurs bergerak.
- **Estimasi gabungan sebagai baris sekunder** ("≈ €1.437 total · kurs ECB 30 Okt"), selalu dengan tanda "≈" dan tanggal kurs. Pengguna Bluecoins menyebut opsi EACR (nilai berdasarkan kurs rata-rata pembelian vs. kurs hari ini) penting karena keduanya menjawab pertanyaan berbeda.\[39\]
- **Budget per kategori per mata uang** (sudah ada di rencana) lebih jujur daripada satu budget yang dikonversi. Tambahkan opsi "budget gabungan" yang memakai kurs awal bulan.

**Sumber kurs (offline-first):** **Frankfurter** (`api.frankfurter.dev`) gratis, tanpa API key, open source, dan menyediakan kurs referensi ECB. Halaman kurs referensi ECB menyatakan "The reference rates are usually updated at around 16:00 CET every working day, except on TARGET closing days". IDR ada dalam daftarnya (30 Oktober 2026: EUR 1 = IDR 20275,17), dan ECB sendiri memperingatkan "Using the rates for transaction purposes is strongly discouraged", jadi cocok untuk estimasi, bukan pengganti kurs transfer nyata Anda. Ambil sekali sehari saat online, simpan di tabel `fx_rates(date, base, quote, rate)`, dan pakai kurs terakhir bila offline (Lunch Money juga fallback ke hari terdekat).\[40\]

**Jebakan yang harus dihindari:**
- **Desimal berbeda:** IDR praktis tanpa sen, EUR 2 desimal. Simpan `minor_unit` per mata uang dan jangan hardcode ×100. PR multi-currency Actual Budget justru tersandung asumsi "bagi 100 untuk semua mata uang".\[26\]
- **Format angka:** id-ID dan fr-FR sama-sama memakai titik/spasi untuk ribuan dan koma untuk desimal, berbeda dari en-US. Gunakan `Intl.NumberFormat` dengan locale eksplisit, dan tentukan format satu kali di pengaturan.
- **Ganti mata uang dasar:** Toshl memberi 3 opsi (kurs historis/kurs tunggal/hanya ganti simbol) dan memperingatkan bahwa kurs kustom bisa hilang.\[16\]\[41\] Simpan kurs asli dan *jangan pernah* menimpanya saat base diganti.
- **Transfer jangan dihitung sebagai pengeluaran/pemasukan** (Bluecoins dan Money Lover mengecualikannya dari laporan).\[18\]\[29\]
- **Monarch sebagai anti-contoh:** menampilkan 10.000 CAD + 10.000 USD sebagai "$20,000".\[7\]

**Siapa paling baik?** Untuk *tracking*: Toshl (paling dalam) dan Lunch Money (kurs historis per transaksi).\[42\] Untuk *model akun* yang mirip rencana Anda: Bluecoins (kurs per akun + per transaksi + fee transfer) dan Wallet.

## 3. Prioritas Fitur: Apa yang Membuat Orang Bertahan

**Temuan utama dari diskusi Reddit (dirangkum oleh beberapa blog app):** keluhan terbesar bukan kekurangan fitur, melainkan "I gave up because I forgot to log" serta proses mencatat yang terlalu lambat atau terlalu banyak langkah. Keluhan lain: langganan mahal dan aplikasi cloud yang tutup atau berubah arah.\[43\]\[44\] Sejak Intuit menutup Mint pada 23 Maret 2024 dan memindahkan penggunanya ke Credit Karma (menurut NerdWallet, "setting monthly budgets and customized categories didn't make the cut"), sebagian pengguna justru sengaja memilih pencatatan **manual**, karena tindakan mencatat itulah yang menciptakan kesadaran belanja. *Catatan sumber: ringkasan ini berasal dari blog vendor aplikasi (Vento, Hunter Vault) yang punya kepentingan, jadi anggap sebagai indikasi, bukan data survei.*

**Dinilai bernilai tinggi:**
1. Input sangat cepat: keypad sendiri, kategori 1 tap, akun default terakhir.
2. Widget + quick-add dari home screen/notifikasi.
3. Transaksi berulang & langganan (Cashew, Copilot, Money Lover menonjolkan ini).\[45\]\[46\]\[47\]
4. Peringatan budget mendekati batas (Finku, Sribuu, Cashew).\[35\]\[48\]\[49\]
5. Search, filter, tag.
6. Backup yang dapat dipercaya (Cashew: Google Drive otomatis).\[22\]\[50\]

**Sering dianggap bloat untuk konteks Anda:** bank sync (tidak realistis untuk BNI/BCA + bank Prancis, dan bertentangan dengan offline-first), chatbot AI, investasi/kripto, gamifikasi berlebihan, laporan akuntansi (neraca/laba-rugi).

**Fitur yang belum ada di rencana dan layak ditambah:**
- **Quick-add dari widget dan notifikasi persisten** (paling penting).
- **Template/favorit** + saran judul berdasarkan riwayat.
- **Kalkulator di field jumlah.**
- **Search + filter + tag** (mis. #liburan, #kampus).
- **Savings goals** (tiket pulang, deposit apartemen/CAF).
- **Tampilan langganan** (Spotify, Free Mobile, asuransi) dari recurring rules, dengan total per bulan per mata uang.
- **Review bulanan** (layar ringkas setiap tanggal 1: total per mata uang, 3 kategori terbesar, biaya konversi bulan ini, budget tercapai/tidak).
- **Pengingat harian opsional** ("Belum ada catatan hari ini") via `expo-notifications`.
- **Lampiran foto struk**: prioritas rendah (menambah ukuran backup).

## 4. Arah Visual: Keluar dari "AI Slop"

**Ciri UI "AI slop" yang perlu dihindari** (dirangkum dari panduan desainer dan alat audit open source seperti *avoid-ai-design* dan *Hallmark*):\[51\]\[52\]
- Gradien ungu→biru/indigo, teks bergradien, blob bercahaya.\[52\]\[53\]
- **Dark mode permanen secara refleks** dengan border kartu neon/glow.\[54\]
- Inter/Poppins/Geist di semua tempat tanpa pasangan yang dipilih.\[54\]
- Radius sudut seragam di semua elemen; kartu bersarang; deretan "3 kartu fitur".\[51\]\[55\]\[56\]
- Garis warna 3–4 px di sisi kiri kartu.\[54\]
- Glassmorphism di mana-mana; ikon emoji; ikon garis tipis generik.\[52\]
- **Peringatan penting:** "default yang terlihat berselera" kini juga dianggap slop, misalnya **krem + terakota**, Instrument Serif/Fraunces/Space Grotesk, serta caption mono huruf kapital di atas setiap judul.\[52\]\[53\] Solusinya bukan menghindari daftar, tetapi membuat **keputusan spesifik untuk konteks Anda** dan memakai warna **secara semantik** (warna = makna: EUR, IDR, pengeluaran, peringatan), bukan dekorasi.\[53\]\[55\]

**Tipografi angka.** Di React Native, `fontVariant: ['tabular-nums']` didokumentasikan sebagai style prop tanpa label khusus iOS,\[57\] tetapi hanya berfungsi bila file font memiliki fitur OpenType `tnum`, jadi uji di perangkat Android. Font Google yang terkonfirmasi punya tabular figures: **IBM Plex Sans**, **Source Sans 3** (fitur angka paling lengkap), Roboto, Noto Sans, dan **JetBrains Mono** (monospace).\[58\]\[59\]\[60\] **DM Sans hanya punya angka proporsional**, jadi hindari untuk kolom angka.\[61\] Semuanya tersedia via `@expo-google-fonts/*`.

### Opsi A: "Buku Kas" (rekomendasi)
Konsep: buku tabungan/buku kas kertas, editorial, angka besar sebagai pahlawan.
- **Terang:** latar `#F4F1EA` (kertas, sedikit dingin agar tidak jadi krem-terakota klise), permukaan `#FBFAF6`, tinta `#1C1B19`, garis `#D9D4C7`.
- **Gelap:** latar `#16181D` (tinta biru-arang, **bukan** `#000`), permukaan `#1F232A`, teks `#ECE8DF`.
- **Aksen semantik:** EUR = indigo `#2E4A8B` (indigo batik), IDR = kunyit `#C98A0B`, pengeluaran = merah bata `#B23A2E`, pemasukan = hijau daun `#2F7D4F`.
- **Tipografi:** IBM Plex Sans (UI + angka `tnum`, bobot 600–700 untuk saldo besar 40–56 pt), IBM Plex Mono untuk kode mata uang kecil (`EUR`, `IDR`) atau sebaliknya. Hindari serif "tren".
- **Komposisi:** daftar transaksi berupa *baris bergaris* seperti buku kas (garis tipis, tanpa kartu), dikelompokkan per tanggal dengan subtotal harian. Kartu hanya untuk 1–2 elemen utama. Radius kecil (4–8 px) dan konsisten.
- **Grafik:** donut tipis (stroke tebal, tanpa label di dalam) dengan legenda tabel di bawahnya. Tren 6 bulan sebagai bar sederhana dua warna (EUR/IDR) tanpa gradien.
- **Kelebihan:** paling khas, mudah dibaca di siang hari, cocok untuk budaya "mencatat", mudah diimplementasikan. **Kekurangan:** perlu disiplin tipografi; mode gelap perlu dirancang terpisah agar tidak terasa "dibalik".

### Opsi B: Material You (dynamic color)
- Warna diambil dari wallpaper (Android 12+), dengan fallback *seed color* (mis. `#2E4A8B`).\[62\]
- **Implementasi di SDK 54:** `react-native-material-you-colors` (`getMaterialYouPalette`, `generatePaletteFromColor`). Pembacaan palet sistem hanya berfungsi di production/dev build, bukan Expo Go.\[63\] Mulai SDK 55, Expo Router menyediakan `Color.android.dynamic.*`, dan `@expo/ui` menyediakan `useMaterialColors` (seedColor) di versi SDK yang lebih baru, jadi relevan bila nanti Anda upgrade.\[62\]\[64\]
- **Kelebihan:** terasa native Android dan personal, light/dark gratis, dan Cashew membuktikan pendekatan ini disukai; README GitHub-nya mencatat "Cashew was featured on Google Play's Editorial 'New Apps We Love' (November 2023)!" dan "Cashew was featured in the Material You Apps List!". **Kekurangan:** identitas app ikut wallpaper; warna EUR/IDR harus tetap statis agar maknanya tidak hilang.

### Opsi C: "Kartu Pos Lille–Jakarta" (berani, berkarakter)
- Dua dunia: biru-abu Flandria `#3B5368` + bata Lille `#A4483A` di satu sisi, hijau-tosca tropis `#1F7A6E` + kunyit `#D9A21B` di sisi lain, di atas latar putih hangat `#FAF8F4` / gelap `#14171A`.
- Ilustrasi datar sederhana (ikon kategori custom bergaya cap pos/stiker, bukan emoji), header saldo dengan blok warna solid besar, satu blok per mata uang.
- **Kelebihan:** paling personal dan berkesan. **Kekurangan:** butuh aset ilustrasi/ikon custom dan berisiko ramai; lebih sulit dibuat konsisten.

**Motion (semua opsi):** angka saldo "menggulung" saat berubah, keypad dengan haptic ringan per tap, sheet tambah transaksi muncul dengan spring pendek (< 250 ms), progress budget mengisi saat layar dibuka. Hindari animasi dekoratif terus-menerus.

## 5. Rekomendasi Library (Expo SDK 54 / RN 0.81)

| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Grafik | **Tetap `react-native-gifted-charts`** | Berbasis SVG, jalan di Expo Go, cukup untuk donut + bar 6 bulan. Pindah ke **Victory Native (XL, Skia)** hanya bila butuh gesture/scrubbing; perlu dev build dan versi Skia/Reanimated harus cocok dengan SDK\[65\]\[66\] |
| Bottom sheet | **`@gorhom/bottom-sheet` v5.2.x** | Kompatibel dengan Reanimated 4.1 + worklets di SDK 54, **asal** `babel.config.js` memakai `react-native-worklets/plugin` (bukan plugin Reanimated lama) dan app dibungkus `GestureHandlerRootView`. Banyak laporan "sheet tidak terbuka" setelah upgrade ke SDK 54 berasal dari sini.\[67\]\[68\]\[69\] `@expo/ui` BottomSheet (API kompatibel gorhom, berbasis Jetpack Compose) baru ada di SDK yang lebih baru\[70\]\[71\] |
| Animasi | **Reanimated 4** (bawaan SDK 54) | Untuk angka bergulung, progress, layout transitions |
| Haptics | **`expo-haptics`** | `selectionAsync` per tap keypad, `notificationAsync(Success)` saat simpan |
| Keypad angka | **Buat sendiri** (grid `Pressable`) | Lebih cepat daripada keyboard sistem; dukung operator `+ − × ÷`, tombol `000`, dan pemisah desimal yang mengikuti mata uang (IDR tanpa desimal) |
| Tema | Token sendiri via Context + `useColorScheme` | Simpan token semantik (`bg`, `surface`, `ink`, `eur`, `idr`, `expense`), opsional palet Material You |
| Font | `expo-font` + `@expo-google-fonts/ibm-plex-sans`, `/ibm-plex-mono` | Set `fontVariant: ['tabular-nums']` di komponen `<Money>` |
| Widget | `react-native-android-widget` (sudah dipakai) | Tambahkan tombol yang membuka deep link `budgetapp://add?account=eur&category=makan` |
| Kurs | `fetch` ke Frankfurter + cache SQLite | Sekali sehari, fallback ke kurs terakhir |
| Notifikasi | `expo-notifications` | Pengingat harian + aksi quick-add |

## Rekomendasi: Perubahan Prioritas pada Rencana Overhaul

1. **(P0) Layar tambah transaksi < 5 detik:** bottom sheet + keypad custom dengan kalkulator, kategori 1 tap (6–8 terbanyak), akun terakhir sebagai default, haptics, dan pratinjau konversi EUR↔IDR (gaya Toshl).
2. **(P0) Quick-add dari widget dan notifikasi** via deep link; widget menampilkan sisa budget bulan ini per mata uang.
3. **(P0) Model FX:** tabel `fx_rates` (Frankfurter/ECB, cache harian), `minor_unit` per mata uang, kurs tersimpan per transaksi, fee transfer sebagai field/transaksi terpisah, transfer dikecualikan dari laporan.
4. **(P0) Sistem visual baru (Opsi A "Buku Kas")**: token warna semantik, IBM Plex Sans + tabular nums, daftar bergaris tanpa kartu, mode gelap arang `#16181D`. Buang hitam pekat dan aksen neon.
5. **(P1) Home:** dua saldo besar (EUR, IDR) + baris "≈ total" dengan tanggal kurs → progress budget bulan ini → 5 transaksi terakhir. Urutan bisa diatur (gaya Cashew).
6. **(P1) Template/favorit + saran judul**, **search + filter + tag**.
7. **(P1) Tampilan langganan** dari recurring rules + **pengingat harian opsional**.
8. **(P1) Review bulanan** termasuk "biaya konversi bulan ini" (fitur pembeda yang tidak dimiliki kebanyakan app).
9. **(P2) Savings goals** dengan progress bar (gaya YNAB Targets).
10. **(P2) Opsi tema Material You** (toggle di pengaturan), dengan warna EUR/IDR tetap statis.
11. **(P3) Lampiran foto struk, kalender bulanan.**

**Arah visual yang direkomendasikan:** Opsi A "Buku Kas", karena paling khas untuk konteks Anda (mahasiswa yang "mencatat" dua mata uang), paling murah dibangun di RN, dan langsung menjawab keluhan "AI slop": latar kertas/arang (bukan hitam), angka tebal tabular sebagai elemen utama, warna yang punya makna (indigo = EUR, kunyit = IDR), dan baris bergaris menggantikan kartu bundar seragam. Material You dijadikan opsi tema, bukan default.

## Caveats
- Banyak perbandingan multi-currency (Tallyroot, Borderless Budget, Budgero, getfinny) ditulis oleh **pesaing** yang menjual aplikasi multi-currency. Fakta inti sudah dicocokkan dengan dokumentasi resmi (Actual Budget, YNAB, Monarch via kutipan help center, Bluecoins, Wallet, Toshl, Lunch Money, Spendee, Money Lover, Realbyte), tetapi peringkat "terbaik" dari blog tersebut perlu dibaca kritis.
- Sumber kurs Money Lover tidak terdokumentasi resmi; frekuensi pembaruan kurs Spendee juga tidak terkonfirmasi di halaman resminya saat ini.
- Cakupan Frankfurter disebut berbeda-beda oleh pihak ketiga (30-an mata uang). Beranda resminya (frankfurter.dev) kini menyebut "a free exchange rates API for 228 currencies from 106 central banks and official sources… You don't need an API key", dengan data khusus ECB di `/v2/providers/ecb/rates`. Untuk EUR/IDR keduanya cukup.
- Hex dan pasangan font di atas adalah rekomendasi desain saya, bukan hasil riset kuantitatif; uji kontras (WCAG AA) dan fitur `tnum` di perangkat Android nyata sebelum dikunci.
- Versi library berubah cepat; cek `npx expo install --check` untuk versi yang cocok dengan SDK 54.

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
