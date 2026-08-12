#!/usr/bin/env python3
"""Edit hero-new-document-draft.png (2026-08-12, fifth pass).

Two crops on top of the real screenshot already in place (Describe-what-
you-need step of the AI drafter, same real capture used since the
Jul-29-vs-Aug-5-redesign screenshot swap):

1. Crop out the centered yellow icon badge at the top -- direct ask, "since
   in the page there is already a badge" (the reasons-grid row already
   shows a small icon badge next to the "Draft" label, so the same badge
   repeated inside the screenshot itself is redundant). Same reasoning /
   same row range as the Magic Quote image (badge occupies y=14-69 in both
   -- both screenshots share the same 567/568px app viewport scale).

2. Cut out the amber legal-disclaimer banner and the "I understand..."
   consent checkbox row -- direct ask, "remove the legal disclaimer and
   consent area from the Draft image". That block runs from the end of the
   textarea (border+resize-handle bottom ~y=453-459) down through the
   checkbox row (~y=592), immediately before the real "Generate draft"
   button (yellow fill starts y=625). Removing it lets the Describe field
   flow straight into the real Generate-draft button, matching the trimmed
   framing already used on the Quote image.

All pixel coordinates were measured directly against this specific
567x689 source screenshot -- re-measure if the source screenshot is ever
replaced.
"""
import os
from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), "..", "public", "hero-new-document-draft.png")

# Badge crop: badge itself spans y=14-69 in the source (identical to the
# Magic Quote screenshot's badge row); start just after it and add a fresh
# top margin, same as the Quote image treatment.
BADGE_BOTTOM = 69
TOP_PAD = 24

# Disclaimer + consent checkbox cut: textarea's own border/resize-handle
# ends by y=460 (border row measured at y=453); the real "Generate draft"
# button's yellow fill starts at y=625. Cut everything between, keep a
# small gap on each side.
KEEP1_BOTTOM = 460
KEEP2_TOP = 615
GAP = 24  # gap reinserted between the textarea and the Generate-draft button


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size

    part1 = im.crop((0, BADGE_BOTTOM, w, KEEP1_BOTTOM))
    part2 = im.crop((0, KEEP2_TOP, w, h))

    new_h = TOP_PAD + part1.height + GAP + part2.height
    out = Image.new("RGB", (w, new_h), "white")
    out.paste(part1, (0, TOP_PAD))
    out.paste(part2, (0, TOP_PAD + part1.height + GAP))

    out.save(SRC)
    print(f"wrote {SRC} {out.size}")


if __name__ == "__main__":
    main()
