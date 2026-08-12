#!/usr/bin/env python3
"""Edit hero-magic-quote.png (2026-08-12, fourth pass).

Two changes on top of the real screenshot already in place (itemized quote
editor, badge cropped from the Jul-29-vs-Aug-5-redesign mixup two passes
ago -- see this script's git history / the file-header comment in
homepage-tier1-preview.tsx for that story):

1. Crop out the centered yellow icon badge at the top -- direct ask, "since
   in the page there is already a badge" (the reasons-grid row already
   shows a small Receipt-icon badge next to the "Quote" label, so the same
   badge repeated inside the screenshot itself is redundant).
2. Append a yellow "Create document ->" button at the bottom -- direct ask.
   This is a REAL button (magic-quote-form.tsx's review-step primary CTA,
   real copy "Create document ->"), but the real one renders as a plain
   dark Button, not yellow -- recoloring it to this app's brand cta style
   (bg-yellow-300/text-slate-900) is a deliberate marketing-asset deviation
   from the live product, same call already made for this same button on
   the pre-redesign screenshot in an earlier pass. No screenshot exists of
   this exact button in context (Michael's real capture was cut off before
   reaching Subtotal/Total), so it's synthesized here rather than cropped
   from a capture -- low risk since it's one isolated, well-defined element
   with known real copy, not a whole layout being invented.

All pixel coordinates were measured directly against this specific
568x637 (pre-crop) / 568x434 (this script's own prior output, badge still
present) source -- re-measure if the source screenshot is ever replaced.
"""
import os
from PIL import Image, ImageDraw, ImageFont

SRC = os.path.join(os.path.dirname(__file__), "..", "public", "hero-magic-quote.png")

# Badge crop: badge itself spans y=14-69 in the source; start just after it
# and add a fresh top margin (the natural 7px gap to the heading is too
# tight on its own).
BADGE_BOTTOM = 69
TOP_PAD = 24

# New button area appended at the bottom.
BTN_MARGIN_X = 20
BTN_HEIGHT = 50
BTN_TOP_GAP = 24
BTN_BOTTOM_PAD = 20

YELLOW = (253, 224, 71)  # tailwind yellow-300
NAVY = (15, 23, 42)  # tailwind slate-900
RADIUS = 10

FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size

    cropped = im.crop((0, BADGE_BOTTOM, w, h))

    new_h = TOP_PAD + cropped.height + BTN_TOP_GAP + BTN_HEIGHT + BTN_BOTTOM_PAD
    out = Image.new("RGB", (w, new_h), "white")
    out.paste(cropped, (0, TOP_PAD))

    btn_top = TOP_PAD + cropped.height + BTN_TOP_GAP
    btn_box = (BTN_MARGIN_X, btn_top, w - BTN_MARGIN_X, btn_top + BTN_HEIGHT)

    draw = ImageDraw.Draw(out)
    draw.rounded_rectangle(btn_box, radius=RADIUS, fill=YELLOW)

    label = "Create document →"
    font = ImageFont.truetype(FONT_PATH, 18)
    text_bbox = draw.textbbox((0, 0), label, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]
    cx = (btn_box[0] + btn_box[2]) / 2
    cy = (btn_box[1] + btn_box[3]) / 2
    draw.text((cx - text_w / 2 - text_bbox[0], cy - text_h / 2 - text_bbox[1]), label, font=font, fill=NAVY)

    out.save(SRC)
    print(f"wrote {SRC} {out.size}")


if __name__ == "__main__":
    main()
