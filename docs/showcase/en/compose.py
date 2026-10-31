"""English LinkedIn carousel (1080x1350 PNGs + one PDF) from the screenshots in en/screens/.

Reuses the layout helpers of ../compose.py. Needs Pillow. Run from the repository root:
    python docs/showcase/en/compose.py
Screens: emulator, English sample data (no real finances), app language set to English in Settings,
demo-mode status bar.
"""
import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('compose_base', HERE.parent / 'compose.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
base.SCREENS = HERE / 'screens'

SLIDES = HERE / 'slides'
GITHUB = 'github.com/<username>/rupiero'  # placeholder: replace with the repository link

SLIDE_DEFS = [
    ('Two currencies, never mixed',
     'Euro and rupiah balances side by side, plus an approximate total at the ECB reference rate.',
     ['01-dashboard.png'], None),
    ('Light or dark, your choice',
     'Follows the phone, or pick light or dark in Settings. The date picker and widget follow too.',
     ['02-dashboard-dark.png'], None),
    ('Log an expense in 5 seconds',
     'A keypad with a built-in calculator: 12.5 + 3.2 is €15.70, previewed in rupiah as you type.',
     ['03-quick-add.png'], None),
    ('See what each conversion really costs',
     'The rate you actually got, how far it is from the ECB rate that day, and the fee you paid.',
     ['04-transfer.png'], None),
    ('Budgets per currency',
     'Per category and month, in euro and rupiah separately. A warning from 80%, red once over.',
     ['05-budget.png'], None),
    ('See where the money goes',
     'Spending by category and a six-month trend, drawn in the same ledger style.',
     ['06-charts.png'], None),
    ('From your home screen',
     'What is left of this month’s budget per currency, and one-tap quick add for EUR and IDR.',
     ['07-widget.png'], None),
    ('Privacy in one tap',
     'The eye icon hides every amount, in the app and optionally in the widget.',
     ['08a-before-hide.png', '08b-hidden.png'], ['Before', 'After']),
]

STACK = [
    ('React Native', 'Expo SDK 54, new architecture'),
    ('TypeScript', 'strict, end to end'),
    ('SQLite', 'offline-first, versioned migrations'),
    ('320+ tests', 'money in integer minor units, BigInt FX'),
]


def stack_slide(index: int, total: int) -> Image.Image:
    img, top = base.base(index, total, 'How it is built',
                         'No server and no account: every number stays on the phone.')
    d = ImageDraw.Draw(img)
    name_font = base.font(base.BOLD, 46)
    note_font = base.font(base.REGULAR, 28)
    y = top + 24
    for name, note in STACK:
        d.text((base.MARGIN, y), name, font=name_font, fill=base.INK)
        d.text((base.MARGIN, y + 62), note, font=note_font, fill=base.MUTED)
        y += 132
        d.line((base.MARGIN, y - 22, base.W - base.MARGIN, y - 22), fill=base.LINE, width=1)
    y += 40
    d.line((base.MARGIN, y, base.W - base.MARGIN, y), fill=base.INK, width=2)
    d.line((base.MARGIN, y + 7, base.W - base.MARGIN, y + 7), fill=base.INK, width=2)
    d.text((base.MARGIN, y + 40), 'Source code', font=base.font(base.REGULAR, 28), fill=base.MUTED)
    d.text((base.MARGIN, y + 82), GITHUB, font=base.font(base.MONO, 36), fill=base.EUR)
    return img


def main() -> None:
    SLIDES.mkdir(parents=True, exist_ok=True)
    total = len(SLIDE_DEFS) + 2
    slides = [base.cover(total)]
    for i, (title, subtitle, screens, labels) in enumerate(SLIDE_DEFS, start=2):
        img, top = base.base(i, total, title, subtitle)
        base.place_phones(img, top, screens, labels)
        slides.append(img)
    slides.append(stack_slide(total, total))
    for old in SLIDES.glob('slide-*.png'):
        old.unlink()
    for i, img in enumerate(slides, start=1):
        img.save(SLIDES / f'slide-{i:02d}.png', optimize=True)
    slides[0].save(HERE / 'rupiero-carousel-en.pdf', save_all=True, append_images=slides[1:], resolution=150)
    print(f'{len(slides)} slides written to {SLIDES} and rupiero-carousel-en.pdf')


if __name__ == '__main__':
    main()
