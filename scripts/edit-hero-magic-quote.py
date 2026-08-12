#!/usr/bin/env python3
"""Edit hero-magic-quote.png (2026-08-12, third pass).

SOURCE SWAPPED entirely this round. The first two passes edited a stale
Jul-29 raster capture (Quote title/Currency/Bill to/Line items/Tax rate/
Notes, no centered icon badge, plain dark "Create document" button) that
turned out to predate the 2026-08-05 redesign (centered yellow icon badge +
heading, same treatment new-document-client.tsx's Seal/Draft tabs already
got). Michael supplied a fresh real screenshot of the CURRENT itemized-quote
screen directly (uploads/1a309aef-...-1786493532876_image.png, 568x637) --
this script now edits THAT image, copied into public/ first, not the old
one. hero-magic-quote.png before this script runs must already be that new
screenshot (see run() below -- it reads from SRC in place, so run this
against a fresh copy of the new capture, not repeatedly against its own
prior output).

One change (this pass already has the real centered badge + real yellow
"Generate quote"-style button baked in from capture, so no button recolor
needed anymore): crop out "Valid until (optional)" -- direct ask -- leaving
Quote title/Currency/Bill to/Customer email/Line items/+Add line item, and
truncate before "Tax rate %" (standing ask from the previous pass, and this
capture happens to end almost exactly there anyway).

All pixel coordinates below were measured directly against this specific
568x637 PNG -- re-measure if the source screenshot is ever replaced again.
"""
import os
from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), "..", "public", "hero-magic-quote.png")

# Middle strip removed: "Valid until (optional)" label + field.
CUT_TOP = 320
CUT_BOTTOM = 403

# Truncate here -- right after "+ Add line item", before "Tax rate %".
FULL_BOTTOM = 517


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size

    top_part = im.crop((0, 0, w, CUT_TOP))
    mid_part = im.crop((0, CUT_BOTTOM, w, FULL_BOTTOM))

    stitched = Image.new("RGB", (w, top_part.height + mid_part.height), "white")
    stitched.paste(top_part, (0, 0))
    stitched.paste(mid_part, (0, top_part.height))

    stitched.save(SRC)
    print(f"wrote {SRC} {stitched.size}")


if __name__ == "__main__":
    main()
