#!/usr/bin/env python3
"""Fix hero-magic-quote.png's bottom button (2026-08-12, sixth pass).

Direct correction after Michael sent a real screenshot of the actual
button: the fifth pass (edit-hero-magic-quote.py) synthesized a
"Create document ->" button, assuming the itemized editor screen ends on
its review-step CTA. Wrong button -- the real screenshot shows "Generate
quote" with a small receipt/$ icon, which is the DESCRIBE step's primary
CTA (magic-quote-form.tsx line ~463-471, variant="cta", real copy
ql("generateQuote") = "Generate quote", Receipt icon). That button is
*already* yellow/navy in the live product (Button variant "cta" =
bg-yellow-300/text-slate-900, button.tsx line 22) -- no marketing
recoloring needed here, unlike the review-step button the last pass
mistakenly used.

Only touches the button region this script itself owns (the last
BTN_HEIGHT+BTN_BOTTOM_PAD px of the current 568x483 image, appended by
edit-hero-magic-quote.py) -- does not re-run that script's badge-crop
step, which already ran once and would double-crop if repeated.
"""
import os
from PIL import Image, ImageDraw, ImageFont

SRC = os.path.join(os.path.dirname(__file__), "..", "public", "hero-magic-quote.png")

BTN_MARGIN_X = 20
BTN_HEIGHT = 50
BTN_BOTTOM_PAD = 20

YELLOW = (253, 224, 71)  # tailwind yellow-300
NAVY = (15, 23, 42)  # tailwind slate-900
RADIUS = 10

FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def draw_receipt_icon(draw, cx, cy, size):
    """Small receipt-style icon: a rounded square outline with a $ glyph
    inside -- approximates lucide's Receipt icon (real icon used on this
    button live) at marketing-asset scale rather than reproducing its
    exact SVG path.

    2026-08-12 fix: the previous version set `bottom = cy - half * 0.35`,
    which is ABOVE cy -- the box only spanned the top ~15% of `size`
    instead of a full square centered on cy, so the icon rendered as a
    squashed sliver (direct report: "the icon got squashed"). Now a
    proper square, top=cy-half to bottom=cy+half.
    """
    half = size / 2
    left, top, right, bottom = cx - half, cy - half, cx + half, cy + half
    draw.rounded_rectangle((left, top, right, bottom), radius=3, outline=NAVY, width=2)
    font = ImageFont.truetype(FONT_PATH, int(size * 0.58))
    label = "$"
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1]), label, font=font, fill=NAVY)


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size

    btn_box = (BTN_MARGIN_X, h - BTN_BOTTOM_PAD - BTN_HEIGHT, w - BTN_MARGIN_X, h - BTN_BOTTOM_PAD)

    draw = ImageDraw.Draw(im)
    # Erase the previous button (white matches this card's background --
    # see edit-hero-magic-quote.py's `Image.new(..., "white")` base).
    draw.rectangle((0, btn_box[1] - 4, w, h), fill="white")
    draw.rounded_rectangle(btn_box, radius=RADIUS, fill=YELLOW)

    label = "Generate quote"
    font = ImageFont.truetype(FONT_PATH, 18)
    text_bbox = draw.textbbox((0, 0), label, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]

    icon_size = 20
    gap = 8
    group_w = icon_size + gap + text_w
    group_left = (btn_box[0] + btn_box[2]) / 2 - group_w / 2
    cy = (btn_box[1] + btn_box[3]) / 2

    icon_cx = group_left + icon_size / 2
    draw_receipt_icon(draw, icon_cx, cy, icon_size)

    text_x = group_left + icon_size + gap
    draw.text((text_x - text_bbox[0], cy - text_h / 2 - text_bbox[1]), label, font=font, fill=NAVY)

    im.save(SRC)
    print(f"wrote {SRC} {im.size}")


if __name__ == "__main__":
    main()
