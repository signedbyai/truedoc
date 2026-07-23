# CTA click tracking + button-color test

Built 2026-07-23, in response to the 71% (24h) / 55% (7d) bounce rate and
the worry that the yellow CTA color itself might be turning visitors away.
Two separate pieces:

## 1. CTA click tracking (live immediately, no test involved)

Every primary "Start for free" / "Use this template" CTA on the marketing
pages (`/`, `/ai-drafter`, `/magic-quote`, `/templates`, `/templates/[slug]`,
and all five `/vs/*` comparison pages — 10 pages, ~18 buttons) now fires a
`cta_click` custom event via `@vercel/analytics` (`src/components/cta-link.tsx`)
with `page`, `position` (`hero`/`footer`), `color`, and `href` properties.

This answers the standing "are people even pressing it?" question
independent of the color test below — a bounce with zero `cta_click` events
means the page lost people before the CTA; a bounce that includes a
`cta_click` means they clicked through into `/login` and bounced on some
later signup-flow step, a different problem.

Read it in the Vercel dashboard's Analytics → Events tab, or via
`get_web_analytics` with `dataset: "events"`, `filter: eventName eq
'cta_click'`, broken down `by: ["page"]` or `by: ["page","position"]`.

## 2. Button color test

**3-way concurrent test as of 2026-07-23** (went 3 → 2 → 3 the same day —
see the history below). Deterministically assigned per visitor via
`src/flags.ts`'s `cta-color` flag:

- `yellow` — the current color, unchanged.
- `blue` — `bg-blue-600`, a conventional SaaS primary-action color, and the
  color 4 of the 6 competitors surveyed below effectively use.
- `purple` — `bg-purple-700`, deliberately a darker/more saturated purple
  than BoloSign's `#8B5CF6` violet (see the competitor table below) so it
  doesn't read as copying the one competitor already in that color family.

**History of this decision (all on 2026-07-23):**

1. Started as a 3-way split, `yellow` / `blue` / `black` (`black` = the
   existing `default` Button variant, a no-accent control arm).
2. Narrowed to just `yellow` / `blue` the same day — at SignedBy's traffic
   volume, splitting 3 ways was diluting signal too much to read anything
   in a reasonable timeframe.
3. A plan was then made to run this as a *sequential chain* instead:
   yellow-vs-blue for a week, auto-swap the loser for `purple`, run that a
   week, auto-swap that loser for `black` as a final round — via two
   scheduled tasks that would each check results and edit the code
   automatically (no auto-deploy either way).
4. That chain plan was scrapped before either task fired. The real
   tradeoff surfaced in review: sequential rounds aren't a clean
   comparison — week 1's yellow-vs-blue rate and week 2's winner-vs-purple
   rate aren't just measuring color, they're also picking up whatever
   changed about traffic mix, live ad campaigns, or seasonality between
   the two weeks. A concurrent 3-way split avoids that confound at the
   cost of needing more total traffic before any color reaches
   significance — Michael chose that tradeoff deliberately, reverting to
   3-way with `purple` swapped in for `black` from the start, rather than
   the slower-but-time-confounded sequential version. The two scheduled
   tasks were deleted (`cta-color-test-purple-swap`,
   `cta-color-test-black-swap`) before they ever ran.

**Deliberately cookieless.** Per instruction, no cookie is set and nothing
is written to `localStorage`. `identify()` in `flags.ts` derives a stable
bucket from the request's own `x-forwarded-for` + `user-agent` headers,
hashed and modded into one of the active colors — read-only, computed fresh each
request, same privacy posture as Vercel Web Analytics itself (already
documented as cookieless where it's mounted in `layout.tsx`). Tradeoff: a
visitor's color can shift if their IP changes between sessions (new
network, VPN) — accepted cost of staying cookieless.

**No Vercel-managed flag, no `FLAGS_SECRET`.** This uses the open-source
`flags` npm package's "Flags as Code" path (a plain `decide()` function),
not Vercel's dashboard-hosted Flags product — no OIDC linking, no new env
var, nothing to configure in the Vercel dashboard. `FLAGS_SECRET` is only
needed for the Vercel Toolbar's Flags Explorer (live override UI) or to
encrypt flag values in the DOM; neither is needed here since the color name
isn't sensitive. Can be added later if live-toggling without a redeploy
becomes worth it.

**How results show up:** every page render calls `<FlagValues
values={{"cta-color": ctaColor}} />`, which Vercel Web Analytics
auto-detects and uses to annotate that page's pageviews *and* any `track()`
events fired on it — including `cta_click` — with the flag value. So once
there's enough traffic, `get_web_analytics` (or the dashboard's Flags
panel) can be broken down `by: ["flags/cta-color"]` to compare, per color:
visitors, and — filtered to `eventName eq 'cta_click'` — click count. Click
count ÷ visitor count per color is the metric that answers the original
question. (Belt-and-suspenders: `color` is also passed as a plain
`cta_click` event property, so this doesn't depend solely on the
flags-in-DOM mechanism working correctly.)

## Reading it too early

Don't call a winner on a day or two of data — Vercel's bounce/visitor
counts move a lot at this volume (see the Day-2/Day-3 LinkedIn campaign
checks). With a 3-way concurrent split, expect to need longer than the
2-way version would have to reach a readable gap between colors — that's
the accepted cost of avoiding the sequential-testing confound (see history
above). No automated check-in is currently scheduled for this; run the
comparison manually via Vercel Analytics (`flags/cta-color` breakdown,
or the `color` property on `cta_click` events) when there's been enough
time and traffic.

## Competitive & research context (added 2026-07-23)

Checked live CSS on each competitor's site (not just screenshots) for their primary CTA color:

| Company | CTA color | Hex |
|---|---|---|
| DocuSign | Electric indigo/purple (brand color) | `#4C00FF` |
| SignNow | Blue (brand color) | `#0777CF` |
| PandaDoc | Dark green (brand color) | `#248567` |
| Dropbox Sign | Blue (Dropbox brand blue) | `#0061FE` |
| Adobe Acrobat Sign | Blue-indigo (brand color) | `#3B63FB` |
| BoloSign | Violet | `#8B5CF6` |
| **SignedBy — `yellow` (current)** | Yellow (`bg-yellow-300`) | `#FDE047` |
| **SignedBy — `blue` (test variant)** | Blue (`bg-blue-600`) | `#2563EB` |
| **SignedBy — `purple` (test variant)** | Violet (`bg-violet-500`) | `#8B5CF6` |

SignedBy's `blue` variant lands in the same family as 4 of the 6 competitors above (DocuSign, SignNow, Dropbox Sign, Adobe Sign all cluster in the `#0061FE`–`#4C00FF` blue-indigo range) — so that variant is effectively "test the category-normal color." `purple` was originally a deliberately darker `#7E22CE` to stay distinct from BoloSign's `#8B5CF6` violet, then lightened to match BoloSign's shade exactly on 2026-07-23 per explicit request (the initial purple read as too strong/heavy). `yellow` is the outlier of the three — the highest-contrast, most attention-grabbing option, and the only one no competitor uses at all.

Every one of the 6 uses its own cool-toned brand color for the CTA — none use yellow, orange, or red. All optimize for brand consistency, not maximum attention-contrast. That's a point in favor of SignedBy's yellow, not against it: it's the one thing in this category that isn't blending into a sea of blue.

On the research side: the famous HubSpot/Performable red-vs-green test (~21% lift for red) gets over-generalized — the researchers themselves warned against "red always wins." The more defensible, widely-replicated finding (CXL, VWO) is the "isolation effect": a button's specific hue matters less than how much it contrasts with everything around it on that page. Treat any listicle's specific "+38% conversion" style numbers as directional marketing content, not rigorous studies — most don't cite an identifiable primary source. No color is universally best; the A/B test above is the correct way to find out for SignedBy specifically, and yellow-on-white/slate already scores well on the one principle (contrast/isolation) that actually replicates.

## Ending the test

Once a winner is picked: hardcode that color into `cta-link.tsx` (or set it
as `ctaColorFlag`'s `defaultValue` and drop the other one from
`CTA_COLORS`), or just revert every `<CtaLink>` back to a plain
`buttonVariants({ variant: "cta" })` `<Link>` if yellow wins outright.
Delete `src/flags.ts` and the `flags` dependency if nothing else in the app
ever adopts feature flags — no other code depends on it.
