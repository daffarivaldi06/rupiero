"""Builds the LinkedIn carousel (1080x1350 PNGs + one PDF) from the screenshots in screens/.

Needs Pillow (pip install pillow). Run from the repository root:  python docs/showcase/compose.py
Screens were captured on an emulator with sample data (no real finances), demo-mode status bar.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / 'docs' / 'showcase'
SCREENS = HERE / 'screens'
SLIDES = HERE / 'slides'

W, H = 1080, 1350
BG = '#F4F1EA'
INK = '#1C1B19'
MUTED = '#5F5B53'
LINE = '#D9D4C7'
EUR = '#2E4A8B'
IDR = '#8A5D00'

FONTS = ROOT / 'node_modules' / '@expo-google-fonts'
BOLD = str(FONTS / 'ibm-plex-sans' / '700Bold' / 'IBMPlexSans_700Bold.ttf')
REGULAR = str(FONTS / 'ibm-plex-sans' / '400Regular' / 'IBMPlexSans_400Regular.ttf')
MONO = str(FONTS / 'ibm-plex-mono' / '500Medium' / 'IBMPlexMono_500Medium.ttf')

MARGIN = 72


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    line = ''
    for word in text.split():
        candidate = f'{line} {word}'.strip()
        if draw.textlength(candidate, font=fnt) <= width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def phone(screen: Image.Image, height: int) -> Image.Image:
    """The screenshot in a plain ink bezel with rounded corners; no shadow, no gradient."""
    bezel = max(10, height // 70)
    sh = height - 2 * bezel
    sw = round(screen.width * sh / screen.height)
    shot = screen.convert('RGB').resize((sw, sh), Image.LANCZOS)
    radius = round(sh * 0.055)

    frame = Image.new('RGBA', (sw + 2 * bezel, height), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle((0, 0, frame.width - 1, height - 1), radius=radius + bezel, fill=INK)
    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=radius, fill=255)
    frame.paste(shot, (bezel, bezel), mask)
    return frame


def base(index: int, total: int, title: str, subtitle: str) -> tuple[Image.Image, int]:
    """Background, header and footer; returns the image and the y where content may start."""
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((MARGIN, 64), f'{index:02d} / {total:02d}', font=font(MONO, 24), fill=MUTED)
    y = 112
    title_font = font(BOLD, 58)
    for line in wrap(d, title, title_font, W - 2 * MARGIN):
        d.text((MARGIN, y), line, font=title_font, fill=INK)
        y += 70
    y += 6
    sub_font = font(REGULAR, 30)
    for line in wrap(d, subtitle, sub_font, W - 2 * MARGIN):
        d.text((MARGIN, y), line, font=sub_font, fill=MUTED)
        y += 42
    y += 18
    d.line((MARGIN, y, W - MARGIN, y), fill=INK, width=2)
    footer(img)
    return img, y + 36


def footer(img: Image.Image) -> None:
    d = ImageDraw.Draw(img)
    mark = Image.open(ROOT / 'assets' / 'icon.png').convert('RGB').resize((44, 44), Image.LANCZOS)
    y = H - 78
    d.line((MARGIN, y - 18, W - MARGIN, y - 18), fill=LINE, width=1)
    img.paste(mark, (MARGIN, y))
    d.text((MARGIN + 58, y + 6), 'Rupiero', font=font(BOLD, 26), fill=INK)
    label = 'EUR · IDR'
    mono = font(MONO, 22)
    d.text((W - MARGIN - d.textlength(label, font=mono), y + 10), label, font=mono, fill=MUTED)


def place_phones(img: Image.Image, top: int, screens: list[str], labels: list[str] | None = None) -> None:
    bottom = H - 130
    label_space = 48 if labels else 0
    height = bottom - top - label_space
    phones = [phone(Image.open(SCREENS / s), height) for s in screens]
    gap = 48
    total = sum(p.width for p in phones) + gap * (len(phones) - 1)
    x = (W - total) // 2
    d = ImageDraw.Draw(img)
    for i, p in enumerate(phones):
        img.paste(p, (x, top), p)
        if labels:
            lf = font(MONO, 24)
            text = labels[i]
            d.text((x + (p.width - d.textlength(text, font=lf)) / 2, top + height + 14), text, font=lf, fill=MUTED)
        x += p.width + gap


def cover(total: int) -> Image.Image:
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    mark = Image.open(ROOT / 'assets' / 'icon.png').convert('RGB').resize((150, 150), Image.LANCZOS)
    img.paste(mark, (MARGIN - 18, 70))
    y = 250
    d.text((MARGIN, y), 'Rupiero', font=font(BOLD, 104), fill=INK)
    y += 128
    d.text((MARGIN, y), '— budgeting in two currencies', font=font(REGULAR, 42), fill=INK)
    y += 70
    sub = font(REGULAR, 28)
    for line in wrap(d, 'A ledger-style money app for a life split between euros and rupiah.', sub, W - 2 * MARGIN):
        d.text((MARGIN, y), line, font=sub, fill=MUTED)
        y += 40
    mono = font(MONO, 26)
    y += 14
    d.text((MARGIN, y), 'EUR', font=mono, fill=EUR)
    d.text((MARGIN + 70, y), 'IDR', font=mono, fill=IDR)
    d.text((MARGIN + 140, y), '· Android · offline-first', font=mono, fill=MUTED)
    y += 56
    d.line((MARGIN, y, W - MARGIN, y), fill=INK, width=2)
    d.line((MARGIN, y + 7, W - MARGIN, y + 7), fill=INK, width=2)
    # The phone runs off the bottom edge, like a page in a ledger.
    p = phone(Image.open(SCREENS / '01-dashboard.png'), 1000)
    img.paste(p, ((W - p.width) // 2, y + 44), p)
    return img


SLIDE_DEFS = [
    ('Two currencies, never mixed',
     'EUR and IDR balances side by side, with an ≈ total at the ECB rate. Follows light and dark mode.',
     ['01-dashboard.png', '02-dashboard-dark.png'], ['Light', 'Dark']),
    ('Add a transaction in seconds',
     'A keypad with a built-in calculator: 12,5 + 3,2 → €15,70, previewed in rupiah as you type.',
     ['03-quick-add.png'], None),
    ('Know your real exchange rate',
     'Each transfer shows the rate you actually got, how it compares to the ECB reference, and the fee.',
     ['04-transfer.png'], None),
    ('Budgets that warn early',
     'Per category, per month, per currency. Amber from 80 %, red once you go over.',
     ['05-budget.png'], None),
    ('See where the money goes',
     'Spending by category and a six-month trend, drawn in the same ledger style.',
     ['06-charts.png'], None),
    ('Right on your home screen',
     'Remaining budget per currency and one-tap quick add for EUR and IDR.',
     ['07-widget.png'], None),
    ('Private when you need it',
     'One tap on the eye hides every amount, in the app and optionally in the widget.',
     ['01-dashboard.png', '08-hidden.png'], ['Before', 'After']),
]


def main() -> None:
    SLIDES.mkdir(parents=True, exist_ok=True)
    total = len(SLIDE_DEFS) + 1
    slides = [cover(total)]
    for i, (title, subtitle, screens, labels) in enumerate(SLIDE_DEFS, start=2):
        img, top = base(i, total, title, subtitle)
        place_phones(img, top, screens, labels)
        slides.append(img)
    for i, img in enumerate(slides, start=1):
        img.save(SLIDES / f'slide-{i:02d}.png', optimize=True)
    slides[0].save(HERE / 'rupiero-carousel.pdf', save_all=True, append_images=slides[1:], resolution=150)
    print(f'{len(slides)} slides written to {SLIDES} and rupiero-carousel.pdf')


if __name__ == '__main__':
    main()
