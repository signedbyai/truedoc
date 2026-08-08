from PIL import Image, ImageDraw

# One-off processing for the pitch deck's "Designed for business" slide's
# two hero images (direct ask, 2026-08-08). The user sent two REAL phone
# screenshots of the live signing flow to use instead of the next/og
# mockups this deck normally builds (generate-hero-business-presign-
# header.tsx / generate-hero-business-postsign-confirmation.tsx, now
# unused but left committed) -- matches this project's standing
# preference for real product captures over recreated mockups wherever
# one's available.
#
# Run from the repo root with the two source screenshots present at the
# UPLOADS paths below (adjust as needed -- these were the session's
# upload paths, not a stable location):
#   python3 signedby-app/scripts/process-business-slide-screenshots.py

UPLOADS = "/sessions/serene-beautiful-goodall/mnt/uploads"
OUT = "signedby-app/public"

# Pre-signing: real header ("Sent by Amara Okafor's workspace · Signing as
# Michael Eagles · Demo_Consulting_Agreement", trust badges row). Direct
# instruction: scrub the user's own name before it goes in a pitch deck.
# Redact box coordinates found by overlaying a pixel ruler on the source
# image and reading off where "Michael Eagles" starts/ends (865,225)-
# (1165,288) -- solid-fill rather than blur, filled with a color sampled
# from the same row so it reads as a deliberate redaction, not a glitch.
# Crop (0,178)-(1260,940): drops the phone status bar / Gmail nav bar
# above and the empty "fetching document" gap + browser chrome below,
# keeping just the header + intro banner + trust badges.
presign_src = f"{UPLOADS}/SignedBy — Simple e-signatures without the per-seat tax-6ad58a61.png"
im = Image.open(presign_src).convert("RGB")
draw = ImageDraw.Draw(im)
bg_sample = im.getpixel((700, 250))
draw.rectangle([865, 225, 1165, 288], fill=bg_sample)
im.crop((0, 178, 1260, 940)).save(f"{OUT}/hero-business-presign-real.png")

# Post-signing: a DIFFERENT real screenshot than the one the user first
# sent (that one showed "Thanks, Michael Eagles" plus a payment/
# certificate/QR block; direct follow-up: "use this one for the post
# sign, without the QR code so it looks cleaner"). This one reads "Thanks,
# Amara Okafor" (the demo sender, not the user), so no redaction was
# needed -- just a crop down to the white confirmation card, dropping the
# status bar above and the empty page + browser chrome below.
postsign_src = f"{UPLOADS}/SignedBy — Simple e-signatures without the per-seat tax-0b9b4a95.png"
im2 = Image.open(postsign_src).convert("RGB")
im2.crop((0, 740, 1260, 1990)).save(f"{OUT}/hero-business-postsign-real.png")

print("done")
