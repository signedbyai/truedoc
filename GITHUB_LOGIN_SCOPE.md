# GitHub OAuth login — scope

Status: SCOPED 2026-08-03, not built. Direct ask: "can we scope out adding
github as a login method?" — prompted by a side question about whether
Indian users specifically prefer GitHub/LinkedIn/Microsoft/Google logins
(answered separately: no India-specific study found; Google dominates
broadly and especially in India on Gmail penetration alone, GitHub has no
general-population preference signal — it's a developer-specific
identity, not a top-of-funnel login choice).

## Why this one, and why not "more login options = more signups"

This isn't a new idea — it's already named in
[[console-free-tier-scope]] (`CONSOLE_FREE_TIER_SCOPE.md` §4, "Bot & abuse
mitigation"), and that framing matters: GitHub OAuth was scoped there as a
way to raise the bar against disposable free-tier signups (a real GitHub
account is harder to mint in bulk than a throwaway email), sitting
alongside the disposable-email blocklist already shipped
([[disposable-email-blocklist]]). It was **never** framed as "users
prefer logging in with GitHub" — the research just done confirms that's
not a real driver; SignedBy's audience is signers and senders of
documents (freelancers, small businesses, solo consultants per
[[reddit-campaign-status]]/[[linkedin-campaign-status]]), not a
developer audience by default.

So the honest business case here is narrower than "add another button
for conversion": it's (a) a small, genuinely cheap piece of the
abuse-mitigation backlog item, and (b) a real convenience for the one
segment that *is* developer-leaning — Console/API users
([[api-tier-scope]], [[crm-mcp-readiness-phase1-build]]), who are more
likely to already have a GitHub identity than a Microsoft/Google
work account. Framing it as a general-audience growth lever would be
overselling it.

## Current state (`src/app/login/page.tsx`)

Two OAuth providers today, both the same shape:

```tsx
const [oauthLoading, setOauthLoading] = useState<"google" | "azure" | null>(null);

async function handleOAuth(provider: "google" | "azure") {
  setOauthLoading(provider);
  const supabase = createClient();
  const callbackUrl = new URL("/auth/callback", process.env.NEXT_PUBLIC_APP_URL || "https://signedby.ai");
  if (next) callbackUrl.searchParams.set("next", next);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl.toString() },
  });
  ...
}
```

Two icon-only 48×48 buttons (`GoogleIcon`/`MicrosoftIcon`, inline SVGs) in
a `flex justify-center gap-3` row. `/auth/callback/route.ts` is already
fully provider-agnostic — it just calls
`supabase.auth.exchangeCodeForSession(code)` on whatever code Supabase
hands back, with zero provider-specific branching (confirmed by reading
it fresh this pass, not assumed). **This means the callback route needs
zero changes for a third provider** — the entire code-side lift is
inside `login/page.tsx`.

## What adding GitHub actually requires

**Code changes (small, same shape as existing providers):**
- Widen `oauthLoading`'s type and `handleOAuth`'s `provider` param to
  `"google" | "azure" | "github"`.
- Add a `GitHubIcon` component (GitHub's official mark is a single-color
  glyph, simpler than Google's/Microsoft's multi-color marks — trivial
  inline SVG).
- Add a third button to the existing row, same `aria-label`/`title`/
  styling pattern.

That's the whole code diff. No changes to `/auth/callback`, no changes
to `safe-redirect.ts`'s `next`-param handling (provider-agnostic
already), no new API routes.

**Dashboard setup (not something I can do from here — same "your step"
pattern as every other third-party credential this project has needed,
e.g. Trustpilot's BCC address, Sectigo's TSA account):**
1. Register a GitHub OAuth App (under a GitHub org/account you control) —
   needs an Authorization callback URL pointing at Supabase's own OAuth
   callback (`https://<project-ref>.supabase.co/auth/v1/callback`), not
   `signedby.ai` directly — Supabase sits in the middle of the OAuth
   handshake the same way it already does for Google/Microsoft.
2. Take the resulting Client ID + Client Secret and enter them in
   Supabase Dashboard → Authentication → Providers → GitHub, toggle it
   on. Same place Google/Microsoft were originally configured.
3. No change needed to Supabase's Redirect URLs allowlist — that's keyed
   on `redirectTo` (our own `/auth/callback` URL), which is provider-
   independent and already allowlisted for the other two.

## A real gotcha worth flagging before building: GitHub's email is not guaranteed

Google and Microsoft OAuth reliably hand back a real, verified email
address. GitHub is different: a user can set their GitHub email to
private, in which case GitHub (and therefore Supabase) may return a
relay address like `12345+username@users.noreply.github.com` instead of
their real one, or in edge cases no email at all if `user:email` scope
access is restricted. This matters more here than it would for a typical
app, because SignedBy's model leans on email as a real identity in a few
places: magic-link sign-in assumes a reachable inbox, the disposable-
email blocklist ([[disposable-email-blocklist]]) checks the domain at
signup, and the noreply-relay domain could plausibly read as suspicious
to a domain-based check even though it's legitimate. Worth a deliberate
decision at build time (not discovered after the fact) on whether to:
allow the relay email as-is (simplest, matches how most apps handle
this), or explicitly request the primary email and reject sign-in if
GitHub only offers a private/relay one (more consistent with the rest of
the app's email-centric assumptions, but adds friction against the
"no friction in signing flow" principle [[feedback-no-friction-in-signing-flow]]
generally applies to signers, less clearly to this signup path).

## Explicitly out of scope here

- **LinkedIn OAuth** — named in the same backlog item, deliberately not
  bundled in: LinkedIn's OAuth app review process is slower and its API
  surface narrower, a genuinely different effort size, not a "do both
  while you're in there" add-on.
- **"Verified work email" as a signup gate** — the other half of
  `CONSOLE_FREE_TIER_SCOPE.md` §4's abuse-mitigation item; needs its own
  corporate-vs-consumer-domain classifier that doesn't exist today. Not
  needed for GitHub OAuth specifically.
- **Using GitHub identity for anything beyond login** (e.g. pulling
  repos, org membership, or contribution data into the product) — this
  scope is sign-in only, same as Google/Microsoft today.

## Effort

Small — smaller than most things scoped this session. The code change
is a few lines mirroring an existing, working pattern twice over; the
real dependency is the one manual dashboard step (GitHub OAuth App +
Supabase provider toggle), which takes a few minutes but isn't something
I can do from the sandbox. The email-relay handling question above is
the only part worth a deliberate decision rather than just copying the
existing pattern verbatim.
