import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

/** What a Free-plan org sees on /console/app instead of the real thing
 *  (2026-07-31, direct instruction) — console requires Pro or higher, but
 *  Free orgs now land on this page rather than getting redirected away, so
 *  they can see what it does before upgrading. Two pieces:
 *
 *  - ConsoleUpgradePanel replaces the history sidebar + usage panel (the
 *    other left-hand boxes) with a few example prompts ("templates") and
 *    an upgrade CTA. The CTA links straight to the pricing page rather
 *    than trying to reproduce pricing-cards.tsx inline here — one clear
 *    place to compare/choose a plan, not a second copy to keep in sync.
 *  - ConsoleLockedChat replaces the chat pane itself. Console genuinely
 *    doesn't work below Pro (POST /api/console/chat 402s a Free org
 *    regardless), so this is a real locked state, not just a styled
 *    empty one — no input to type into, only the same upgrade CTA. */

const EXAMPLE_PROMPTS = [
  "Send the NDA template to jane@acme.com",
  "Bulk-send the offer letter to this list of 40 candidates",
  "What's the status of the contract I sent Acme Corp?",
  "Void the quote I sent last week",
];

export function ConsoleUpgradePanel() {
  return (
    <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-yellow-300" />
        <p className="text-sm font-medium text-neutral-200">Console is a Pro feature</p>
      </div>
      <p className="mt-1.5 text-xs text-neutral-500">
        Send, bulk-send, check, and void documents by chatting directly — no dashboard clicks. Try things like:
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <li key={prompt} className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs text-neutral-400">
            &ldquo;{prompt}&rdquo;
          </li>
        ))}
      </ul>

      <Link
        href="https://signedby.ai/pricing"
        className="mt-4 block rounded-xl bg-yellow-300 px-3 py-2 text-center text-sm font-semibold text-slate-900 hover:bg-yellow-200"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}

export function ConsoleLockedChat() {
  return (
    <div className="flex h-full min-h-[460px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
        <Lock className="h-4 w-4 text-neutral-400" />
      </div>
      <p className="text-sm font-medium text-neutral-200">Upgrade to Pro to start chatting with console</p>
      <p className="max-w-xs text-sm text-neutral-500">
        Console&apos;s chat is available on the Pro plan and above. Upgrade to send, bulk-send, and manage documents by
        chatting with SignedBy directly.
      </p>
      <Link
        href="https://signedby.ai/pricing"
        className="mt-1 rounded-xl bg-yellow-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-yellow-200"
      >
        View plans
      </Link>
    </div>
  );
}
