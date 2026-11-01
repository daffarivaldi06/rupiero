"""English LinkedIn carousel (1080x1350 PNGs + one PDF) from the screenshots in en/screens/.

Reuses the header, footer, fonts and cover of ../compose.py. Needs Pillow. Run from the repository root:
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
GITHUB = 'github.com/daffarivaldi06/rupiero'

W, H, MARGIN, INK, BG = base.W, base.H, base.MARGIN, base.INK, base.BG
FLOOR = H - 96  # the footer rule; phones are cut off here, as if standing on the ledger line
SCREEN_W = 1080  # screenshot width in pixels


class Phone:
    """A screenshot in a plain ink bezel at a given width, cut off at FLOOR."""

    def __init__(self, screen: str, width: int, x: int, top: int):
        self.shot = Image.open(base.SCREENS / screen).convert('RGB')
        self.bezel = round(width * 0.022)
        self.scale = (width - 2 * self.bezel) / SCREEN_W
        self.x, self.top, self.width = x, top, width

    def paste(self, img: Image.Image) -> None:
        sw = self.width - 2 * self.bezel
        sh = round(self.shot.height * self.scale)
        visible = FLOOR - self.top
        radius = round(sw * 0.09)
        frame = Image.new('RGBA', (self.width, sh + 2 * self.bezel), (0, 0, 0, 0))
        ImageDraw.Draw(frame).rounded_rectangle((0, 0, frame.width - 1, frame.height - 1), radius=radius + self.bezel, fill=INK)
        screen = self.shot.resize((sw, sh), Image.LANCZOS)
        mask = Image.new('L', (sw, sh), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=radius, fill=255)
        frame.paste(screen, (self.bezel, self.bezel), mask)
        frame = frame.crop((0, 0, self.width, min(visible, frame.height)))
        img.paste(frame, (self.x, self.top), frame)

    def to_slide(self, box: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        """A rectangle in screenshot pixels, in slide coordinates."""
        x0, y0, x1, y1 = box
        ox, oy = self.x + self.bezel, self.top + self.bezel
        s = self.scale
        return round(ox + x0 * s), round(oy + y0 * s), round(ox + x1 * s), round(oy + y1 * s)


GAP = 40  # between a marked region and its card


def zoom(img: Image.Image, phone: Phone, region: tuple[int, int, int, int], x: int, width: int,
         y: int | None = None, mark: bool = True) -> None:
    """
    Thin ink frame around `region` on the phone, and the same region enlarged in a stamped card at `x`.
    The card goes just below the region when it fits above the footer rule, otherwise just above it,
    unless `y` is given.
    """
    d = ImageDraw.Draw(img)
    src = phone.to_slide(region)
    pad = 8
    src = (src[0] - pad, src[1] - pad, src[2] + pad, src[3] + pad)
    crop = phone.shot.crop(region)
    height = round(crop.height * width / crop.width)
    crop = crop.resize((width, height), Image.LANCZOS)
    if y is None:
        y = src[3] + GAP if src[3] + GAP + height <= FLOOR - 20 else src[1] - GAP - height
    box = (x, y, x + width, y + height)
    if mark:
        d.rounded_rectangle(src, radius=10, outline=INK, width=3)
        # Connector from the nearer edge of the marked region to the card.
        sx = (src[0] + src[2]) // 2
        sy = src[3] if box[1] > src[3] else src[1]
        tx = min(max(sx, box[0] + 24), box[2] - 24)
        ty = box[1] if box[1] > src[3] else box[3]
        d.line((sx, sy, tx, ty), fill=INK, width=3)
    # Stamp-style offset shadow in ink, then the enlarged crop with an ink border.
    d.rounded_rectangle((box[0] + 8, box[1] + 8, box[2] + 8, box[3] + 8), radius=14, fill=INK)
    mask = Image.new('L', crop.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, height - 1), radius=14, fill=255)
    img.paste(crop, (x, y), mask)
    d.rounded_rectangle(box, radius=14, outline=INK, width=4)


def single(index: int, total: int, title: str, subtitle: str, screen: str) -> tuple[Image.Image, Phone]:
    img, top = base.base(index, total, title, subtitle)
    width = round(W * 0.75)
    phone = Phone(screen, width, (W - width) // 2, top)
    phone.paste(img)
    return img, phone


def pair(index: int, total: int, title: str, subtitle: str, screens: list[str], labels: list[str]) -> Image.Image:
    img, top = base.base(index, total, title, subtitle)
    d = ImageDraw.Draw(img)
    gap = 36
    width = (W - 2 * 48 - gap) // 2
    label_font = base.font(base.MONO, 26)
    for i, (screen, label) in enumerate(zip(screens, labels)):
        x = 48 + i * (width + gap)
        d.text((x + (width - d.textlength(label, font=label_font)) / 2, top - 6), label, font=label_font, fill=base.MUTED)
        Phone(screen, width, x, top + 36).paste(img)
    base.footer(img)
    return img


def cover() -> Image.Image:
    """The base cover (mark, name, tagline, double rule) with the phone enlarged to 75% of the width."""
    img = base.cover(9)
    rule = 570  # just under the cover's double rule
    ImageDraw.Draw(img).rectangle((0, rule, W, H), fill=BG)
    width = round(W * 0.75)
    phone = Phone('01-dashboard.png', width, (W - width) // 2, rule + 36)
    global FLOOR
    floor, FLOOR = FLOOR, H  # the cover has no footer: the phone runs off the bottom edge
    phone.paste(img)
    FLOOR = floor
    return img


STACK = [
    ('React Native', 'Expo SDK 54, new architecture'),
    ('TypeScript', 'strict, end to end'),
    ('SQLite', 'offline-first, versioned migrations'),
    ('320+ tests', 'money in integer minor units, BigInt FX'),
]


def stack_slide(index: int, total: int) -> Image.Image:
    img, top = base.base(index, total, 'How it is built', 'No server and no account: every number stays on the phone.')
    d = ImageDraw.Draw(img)
    name_font = base.font(base.BOLD, 46)
    note_font = base.font(base.REGULAR, 28)
    y = top + 24
    for name, note in STACK:
        d.text((MARGIN, y), name, font=name_font, fill=INK)
        d.text((MARGIN, y + 62), note, font=note_font, fill=base.MUTED)
        y += 132
        d.line((MARGIN, y - 22, W - MARGIN, y - 22), fill=base.LINE, width=1)
    y += 40
    d.line((MARGIN, y, W - MARGIN, y), fill=INK, width=2)
    d.line((MARGIN, y + 7, W - MARGIN, y + 7), fill=INK, width=2)
    d.text((MARGIN, y + 40), 'Source code', font=base.font(base.REGULAR, 28), fill=base.MUTED)
    d.text((MARGIN, y + 82), GITHUB, font=base.font(base.MONO, 36), fill=base.EUR)
    return img


def slides() -> list[Image.Image]:
    total = 9
    out = [cover()]

    out.append(pair(2, total, 'Two currencies, never mixed — in light or dark',
                    'Euro and rupiah side by side with an approximate total at the ECB rate. Light, dark or follow the phone.',
                    ['01-dashboard.png', '02-dashboard-dark.png'], ['Light', 'Dark']))

    img, phone = single(3, total, 'Log an expense in 5 seconds',
                        'A keypad with a built-in calculator, previewed in rupiah as you type.', '03-quick-add.png')
    zoom(img, phone, (36, 660, 560, 910), W - 48 - 620, 620)
    base.footer(img)
    out.append(img)

    img, phone = single(4, total, 'See what each conversion really costs',
                        'The rate you actually got, against the ECB rate of that day, plus the fee.', '04-transfer.png')
    zoom(img, phone, TRANSFER_RATE, 48, W - 96)
    base.footer(img)
    out.append(img)

    img, phone = single(5, total, 'Budgets per currency',
                        'Per category and month, in euro and rupiah separately. A warning from 80%, red once over.',
                        '05-budget.png')
    zoom(img, phone, (36, 955, 1044, 1150), 48, W - 96)
    base.footer(img)
    out.append(img)

    img, phone = single(6, total, 'See where the money goes',
                        'Spending by category and a six-month trend, drawn in the same ledger style.', '06-charts.png')
    base.footer(img)
    out.append(img)

    img, phone = single(7, total, 'From your home screen',
                        'What is left of this month’s budget per currency, and one-tap quick add.', '07-widget.png')
    # Magnified in place: the card covers the widget it enlarges, centred on it.
    widget = (49, 452, 776, 986)
    sx0, sy0, sx1, sy1 = phone.to_slide(widget)
    card_w = W - 2 * 100
    card_h = round((widget[3] - widget[1]) * card_w / (widget[2] - widget[0]))
    cx, cy = (sx0 + sx1) // 2, (sy0 + sy1) // 2
    zoom(img, phone, widget, cx - card_w // 2, card_w, y=min(cy - card_h // 2, FLOOR - 24 - card_h), mark=False)
    base.footer(img)
    out.append(img)

    out.append(pair(8, total, 'Privacy in one tap', 'The eye icon hides every amount, in the app and optionally in the widget.',
                    ['08a-before-hide.png', '08b-hidden.png'], ['Before', 'After']))
    out.append(stack_slide(9, total))
    return out


# The "1 EUR = Rp … / 0.50% below the ECB rate" lines in 04-transfer.png, and where their card goes.
TRANSFER_RATE = (52, 670, 800, 790)


def main() -> None:
    SLIDES.mkdir(parents=True, exist_ok=True)
    out = slides()
    for old in SLIDES.glob('slide-*.png'):
        old.unlink()
    for i, img in enumerate(out, start=1):
        img.save(SLIDES / f'slide-{i:02d}.png', optimize=True)
    out[0].save(HERE / 'rupiero-carousel-en.pdf', save_all=True, append_images=out[1:], resolution=150)
    print(f'{len(out)} slides written to {SLIDES} and rupiero-carousel-en.pdf')


if __name__ == '__main__':
    main()
