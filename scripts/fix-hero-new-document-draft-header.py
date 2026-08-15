#!/usr/bin/env python3
"""Retitle hero-new-document-draft.png's baked-in heading (2026-08-12,
ninth pass, direct ask: "were you able to change 'Generate you document
draft' to 'Generate your Draft' in the draft hero image and animation
title?" -- the live app's CardTitle was already changed
(new-document-client.tsx), but this PNG is a real screenshot, so the old
heading was still baked into its pixels.

Region measured directly against the current 567x513 image, not
eyeballed: a per-row dark-pixel scan (rows 0-150) found the heading's
ink spanning y=31-49, x=149-411 (centered: (149+411)/2=280, image
width/2=283.5 -- close enough given anti-aliasing at the text's edges).
Background at every sampled point around it is flat white (255,255,255),
confirmed by direct pixel read, so a plain white erase rectangle is safe
here the same way fix-hero-magic-quote-button.py used one.

Font: LiberationSans-Bold, same substitute font already used by
fix-hero-magic-quote-button.py / edit-hero-magic-quote.py for this app's
real font-semibold headings (the app's actual font-family is
ui-sans-serif/system-ui -- San Francisco on the Mac this was captured on
-- which isn't installed in this sandbox; Liberation Sans Bold is the
established closest match here, not a new choice). Size 20 to match the
CardTitle's text-xl (20px); real weight is font-semibold (600) but
Liberation Sans has no semibold cut, so Bold is used as the same
approximation the button fix already made.
"""
import os
from PIL import Image, ImageDraw, ImageFont

SRC = os.path.join(os.path.dirname(__file__), "..", "public", "hero-new-document-draft.png")
FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
NAVY = (15, 23, 42)  # tailwind slate-900, same heading color used throughout this app's marketing assets

# Erase box around the measured heading ink (y=31-49, x=149-411), padded
# generously on every side so anti-aliased edge pixels from the old text
# don't survive underneath the new label.
ERASE_BOX = (0, 18, 567, 58)

LABEL = "Generate your Draft"


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    draw = ImageDraw.Draw(im)

    draw.rectangle(ERASE_BOX, fill="white")

    font = ImageFont.truetype(FONT_PATH, 20)
    bbox = draw.textbbox((0, 0), LABEL, font=font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]

    # Center on the same horizontal midline the old heading used (280,
    # image width 567) and the same vertical center (40, midpoint of the
    # measured 31-49 ink range) -- so the new label sits exactly where
    # the old one did, not just "somewhere near the top".
    cx, cy = 280, 40
    draw.text((cx - text_w / 2 - bbox[0], cy - text_h / 2 - bbox[1]), LABEL, font=font, fill=NAVY)

    im.save(SRC)
    print(f"wrote {SRC} {im.size}")


if __name__ == "__main__":
    main()
