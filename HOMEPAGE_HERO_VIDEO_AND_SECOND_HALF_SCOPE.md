# Homepage: hero video + second-half redesign — options

Status: SCOPED, NOT BUILT. Options only, per direct ask — nothing here is
an instruction to build until you pick a direction.

## What "the animation" turned out to mean

Confirmed via a follow-up: this is the Tier 1 preview at `/home-preview`
(`homepage-tier1-preview.tsx`, from `ARACOR_INSPIRED_PRIORITIES.md`, built
2026-08-11 — reviewed live on dev the day before this doc). It has never
been promoted anywhere real: not the live homepage, not even deployed to
dev.signedby.ai (committed to both `master` and `dev` locally, deploy owed
on the dev side only, per that doc's own status note). It is not part of
the live `homepageVariantFlag` A/B test (`homepage-current.tsx` /
`homepage-two-column.tsx`, both of which now carry the three trust pills
from earlier today — Tier 1's copy of that row still only has two; noted
below).

Two things live in that preview today:
1. **A "hero video"** — actually a pure-CSS crossfade of 4 real product
   screenshots (Sign/Seal/Quote/Draft), built as a stand-in because "no
   screen-recording pipeline exists in the sandbox" at the time.
2. **A screenshot-paired "Why SignedBy" reasons section** — Aracor's
   6-reasons pattern, done as the product's own 4 pillars.

Your new ask — "a video that shows the user experience for signing and
sealing" — is the upgrade this doc's own file comment already flagged as
the real goal and didn't build: an actual recorded walkthrough, not a
crossfade of stills.

## Part A — the hero video

### Option 1: Keep the CSS crossfade as-is
Zero new work — it's already built and committed. Real product screenshots,
not stock art, so it's honest. Downside: it's a slideshow, not motion — it
doesn't show anything actually *happening* (a cursor placing a field, a
signature being drawn), which is the specific thing a hero video is for.

### Option 2: Record a real walkthrough — and there's already a proven pipeline for this
The premise that recording isn't possible from the sandbox is now out of
date. Two live precedents already exist in this project:

- **The Product Hunt full-loop GIF** (`marketing/product-hunt-assets/`,
  built 2026-07-14): a real, complete recording of upload → suggest fields
  → recipient → send → sign link → AI summary → sign → submitted, against
  the actual live product. The pipeline and the demo document
  (`Design_Services_Agreement_DEMO.pdf`) both already exist — this could be
  re-cut to a shorter, hero-sized loop rather than built from scratch, or
  the same capture approach rerun fresh against whatever the product looks
  like today (some UI has changed since 07-14).
- **Claude in Chrome's recording tools** (`gif_creator`, available in this
  environment), which weren't factored into the original Tier 1 scoping.
  This can drive a real browser session against dev or prod and capture an
  actual signing flow directly — genuinely new capability since
  `ARACOR_INSPIRED_PRIORITIES.md` was written.

Either path needs a few decisions before it's buildable: record against a
disposable demo org (safer, but "is this real" if noticed) or a real
org's actual document with consent; whether the output is a looping GIF
(simple, works everywhere, larger file) or a muted-autoplay `<video>`/webm
(smaller, smoother, standard for this exact use case — most real product
hero videos on other sites are webm, not GIF, for file-size reasons); and
how long the loop should be (the PH asset covers the whole flow end to
end, a hero loop probably wants a tighter 5-8s highlight, not the full
journey).

### Option 3: Hybrid
Keep the CSS crossfade as the always-works fallback (no video decode
dependency, trivial on slow connections) and add a real recorded clip as
a progressive enhancement once one exists — lower risk sequencing, ships
Option 1 immediately and upgrades later without a page rebuild.

## Part B — rethinking everything below the hero

Today's "second half" (both variants) is: reasons/features →
trusted-by-logo-marquee → three trust pills → pricing. Four directions,
not mutually exclusive:

**B1 — Promote Tier 1's reasons section as-is.** Cheapest, lowest risk:
it's already built, uses real screenshots, and mirrors the dashboard's own
Sign/Seal/Quote/Draft vocabulary (same order/icons a new user sees on day
one). Needs one fix regardless of which direction you pick: Tier 1's trust
pill row is missing the "AI never trains on your documents" pill added to
the live homepage today — currently 2 pills there vs. 3 on the real site.

**B2 — Social-proof-led.** Move real customer proof ahead of feature
explanation — lead with a quote/case-study snippet from SyncMint,
AlphaIndigo, or Studio Vider before the reasons grid. Real dependency,
not just a layout change: there's no case-study copy or testimonial quote
on file for any of the three today, so this needs a customer conversation
before it's buildable, not just design time.

**B3 — Comparison-led.** The hero already leads with "$700+/year vs
DocuSign" as a pill, but that math only lives on `/vs/docusign` today —
one click away. This option pulls a compact version of that comparison
inline onto the homepage itself, leaning harder into the price
differentiation that's already the site's strongest, most-tested hook
rather than introducing a new pitch.

**B4 — Interactive tabbed product tour.** Turn the 4 static reason cards
into a click-to-switch tab UI (click "Seal," the screenshot swaps) —
closer to Aracor's actual interaction pattern, not just its content
structure. Real engineering lift, and worth flagging directly:
`ARACOR_INSPIRED_PRIORITIES.md` explicitly recommended against copying
Aracor's visual identity (serif/burgundy, enterprise register) as a
mismatch for SignedBy's anti-enterprise positioning — that objection was
about aesthetic, not this specific interaction mechanism, but worth
confirming you want the mechanism without the register before building it.

## Sequencing note

Whichever direction gets picked here is exactly the category of change
the standing dev-first rule exists for — it goes to dev.signedby.ai for a
look before any master/prod merge, same as the Tier 1 preview itself was
handled. Given the current deploy-debt pile (`MASTER_BACKLOG.md`), also
worth deciding whether this jumps the queue or waits behind it.

## Open questions
- Hero: Option 1 (ship what exists), 2 (real recording — and if so, PH
  asset re-cut vs. fresh capture vs. Claude-in-Chrome recording), or 3
  (hybrid)?
- Second half: which of B1-B4, or a combination — e.g. B1's reasons
  section kept, with B3's comparison block added above it?
- Where does this sit relative to the deploy-debt backlog — build now, or
  after that's cleared?
