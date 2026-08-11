#!/usr/bin/env python3
"""Edit hero-magic-quote.png (2026-08-12, direct ask).

Unlike the other public/hero-*.png files, this one has no generate-hero-*.tsx
script -- it's a real captured screenshot of magic-quote-form.tsx (Jul 29),
not a synthetic next/og render. So this edit is raster pixel manipulation,
not a re-run of a source-of-truth script.

Two changes:
1. Crop out the "Tax rate % (optional)" and "Notes (optional)" fields --
   remove that middle strip and stitch the top (through "+ Add line item")
   directly to the bottom (Subtotal/Total + buttons), rather than a simple
   top/bottom trim.
2. Recolor "Create document ->" from the plain dark button the real
   (uncustomized) shadcn Button default renders to this app's actual brand
   CTA style (buttonVariants' cta variant: bg-yellow-300 text-slate-900 --
   see ui/button.tsx) -- a deliberate marketing-asset deviation from what's
   literally live today, direct ask, not a fidelity bug.

All pixel coordinates below were measured directly against this specific
592x972 PNG (crop-and-inspect passes, not guessed) -- re-measure if the
source screenshot is ever replaced.
"""
import os
from PIL import Image, ImageDraw, ImageFont

SRC = os.path.join(os.path.dirname(__file__), "..", "public", "hero-magic-quote.png")

# Middle strip removed: right after "+ Add line item" (ends ~578) through
# just before the Subtotal/Total gray box (starts ~810).
CUT_TOP = 592
CUT_BOTTOM = 806

# "Create document" button bbox, measured in the ORIGINAL image.
BTN_LEFT, BTN_TOP, BTN_RIGHT, BTN_BOTTOM = 136, 905, 567, 949

YELLOW = (253, 224, 71)  # tailwind yellow-300
NAVY = (15, 23, 42)  # tailwind slate-900
RADIUS = 12

FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size

    top_part = im.crop((0, 0, w, CUT_TOP))
    bottom_part = im.crop((0, CUT_BOTTOM, w, h))

    stitched = Image.new("RGB", (w, top_part.height + bottom_part.height), "white")
    stitched.paste(top_part, (0, 0))
    stitched.paste(bottom_part, (0, top_part.height))

    # Button coords shift up by the removed strip height, then down by
    # top_part's own height (which already accounts for CUT_TOP) -- net
    # shift is just -(CUT_BOTTOM - CUT_TOP).
    shift = CUT_BOTTOM - CUT_TOP
    btn_box = (BTN_LEFT, BTN_TOP - shift, BTN_RIGHT, BTN_BOTTOM - shift)

    draw = ImageDraw.Draw(stitched)
    # Paint over the old dark button with brand yellow.
    draw.rounded_rectangle(btn_box, radius=RADIUS, fill=YELLOW)

    label = "Create document →"
    font = ImageFont.truetype(FONT_PATH, 20)
    text_bbox = draw.textbbox((0, 0), label, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]
    cx = (btn_box[0] + btn_box[2]) / 2
    cy = (btn_box[1] + btn_box[3]) / 2
    draw.text((cx - text_w / 2 - text_bbox[0], cy - text_h / 2 - text_bbox[1]), label, font=font, fill=NAVY)

    out_path = SRC
    stitched.save(out_path)
    print(f"wrote {out_path} {stitched.size}")


if __name__ == "__main__":
    main()
