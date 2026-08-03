import { Check } from "lucide-react";

// Login screen value panel (LOGIN_VALUE_PANEL_SCOPE.md, built 2026-08-03,
// direct instruction). Sits to the left of the auth card on desktop
// (`lg:` breakpoint), collapses to a compact banner above it on mobile —
// one component with responsive classes rather than two separate ones,
// since the content is identical, only the sizing/padding needs to shrink.
// A dark panel (slate-900 + yellow-300 accents, the same dark-surface
// treatment already used elsewhere in this app's marketing/ad assets)
// gives the previously all-white, single-column login screen some actual
// visual contrast — the "less sterile" ask this was scoped from.
//
// Copy is verbatim from the request, checked against what's actually
// shipped before building (see the scope doc): 3 docs/month matches the
// live Free tier, "sign or seal" covers both regular sending and Verified
// Badge sealing under the same cap, and Free orgs can genuinely generate
// a real API key and call both /api/v1/* and the MCP route with it today
// (confirmed directly in api-auth.ts / api/mcp/route.ts) — not aspirational
// copy.
//
// Shown on both the sign-in and sign-up views (login/page.tsx's `isSignup`
// only toggles copy inside the existing card) — a returning user isn't
// harmed by seeing the value prop again, and keeping one static panel is
// simpler than branching this content on intent too.
export function LoginValuePanel() {
  return (
    <aside className="flex w-full flex-col justify-center bg-slate-900 px-6 py-8 text-white lg:w-[42%] lg:px-14 lg:py-12">
      <div className="mx-auto w-full max-w-sm lg:mx-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-yellow-300">
          Free plan
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Create your free account.
        </h2>
        <ul className="mt-6 space-y-3 text-sm text-slate-200">
          <li className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-300"
              aria-hidden="true"
            />
            <span>Sign or seal 3 documents a month</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-300"
              aria-hidden="true"
            />
            <span>Access API &amp; MCP keys</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-300"
              aria-hidden="true"
            />
            <span>No credit card required</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}
