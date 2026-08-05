// Shared status pill used on the document detail page — both the document-
// level status (Out for signature / Completed / Voided …) and the per-signer
// status (Signed / Viewed / Sent …). One vocabulary of tones so the colours
// mean the same thing everywhere:
//   green  = done / positive          (Signed, Completed)
//   amber  = open / awaiting action   (Out for signature, Viewed, Sent)
//   purple = closed / archived        (a finished, settled document)
//   gray   = neutral / not started    (Not yet sent, Voided)
//   red    = negative                 (Declined)
//
// `pulse` adds a soft ping ring so genuinely-open items draw the eye. It's
// reserved for the live/open states, never the settled ones, and it honours
// prefers-reduced-motion (the ring falls back to a static dot). The text
// label is always present, so meaning never rides on colour alone.

const TONES = {
  green: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-600" },
  amber: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  gray: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  purple: { pill: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  red: { pill: "bg-red-50 text-red-700", dot: "bg-red-600" },
} as const;

export type StatusTone = keyof typeof TONES;

export function StatusPill({
  tone,
  dotTone,
  label,
  pulse = false,
  icon,
  className = "",
}: {
  tone: StatusTone;
  // Lets the dot carry a different colour from the background. Used by the
  // list pills: background answers "does this need me" (only Declined and
  // Sent are coloured), the dot answers "what state is it". Completed is the
  // case that needs the split — over time it becomes most of the list, so a
  // full green pill would spend the loudest colour on the rows that need
  // nothing, while a green dot on grey still reads as done at a glance.
  // Defaults to `tone`, so the detail page is unaffected.
  dotTone?: StatusTone;
  label: string;
  pulse?: boolean;
  // A check mark instead of the status dot — reads as more final than a
  // signer row, so it's used for the terminal "Completed" document state.
  icon?: "check";
  className?: string;
}) {
  const t = TONES[tone];
  const d = TONES[dotTone ?? tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.pill} ${className}`}
    >
      {icon === "check" ? (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
          <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none ${d.dot}`}
            aria-hidden
          />
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${d.dot}`} aria-hidden />
        </span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${d.dot}`} aria-hidden />
      )}
      {label}
    </span>
  );
}

// Per-signer status → pill. Pulse only on "viewed": the signer has opened the
// document and is mid-flow, the hottest open item. "sent" stays amber but
// calm (delivered, not yet opened); "pending" is neutral gray (nothing has
// happened yet). Keyed by the same status strings as signers.status.
export const SIGNER_STATUS_PILL: Record<string, { tone: StatusTone; label: string; pulse?: boolean }> = {
  pending: { tone: "gray", label: "Not yet sent" },
  sent: { tone: "amber", label: "Sent" },
  viewed: { tone: "amber", label: "Viewed", pulse: true },
  signed: { tone: "green", label: "Signed" },
  declined: { tone: "red", label: "Declined" },
};

// Delivery-problem badge, shown ALONGSIDE the signer status pill above (not
// instead of it) — signers.last_email_event (migration 0035) is deliberately
// a separate column from signers.status, since a delivery problem is
// orthogonal to signing progress. bounced/suppressed both mean the invite
// never arrived at all, so they share the same user-facing label; a
// complaint means it DID arrive (the recipient just marked it as spam),
// which is a materially different, less urgent situation. See
// BOUNCE_TRACKING_SCOPE.md.
export const EMAIL_EVENT_BADGE: Record<string, { tone: StatusTone; label: string }> = {
  bounced: { tone: "red", label: "Bounced" },
  suppressed: { tone: "red", label: "Bounced" },
  complained: { tone: "amber", label: "Marked as spam" },
};

// Document-level status → pill (the line under the title). Only "sent" — the
// document is genuinely live/open — pulses; the settled states are still.
export const DOCUMENT_STATUS_PILL: Record<
  string,
  { tone: StatusTone; label: string; pulse?: boolean; icon?: "check" }
> = {
  sent: { tone: "amber", label: "Out for signature", pulse: true },
  // Green = the universal "done" signal; the check mark makes it read as the
  // final, settled state rather than just another signer-level "Signed".
  completed: { tone: "green", label: "Completed", icon: "check" },
  declined: { tone: "red", label: "Declined by a signer" },
  voided: { tone: "gray", label: "Voided" },
};

// List rows (dashboard home + /dashboard/documents) — deliberately NOT
// DOCUMENT_STATUS_PILL. A list is scanned, not read, so it answers a different
// question: "what needs me?" rather than "what state is this document in".
// Three differences follow from that:
//
//  1. Background is coloured only for the two states you'd want to spot —
//     Declined (act now) and Sent (waiting on someone else). Draft, Completed
//     and Voided sit on grey, with the dot carrying the state. Completed is
//     the important one: it ends up being most of a mature list, and a full
//     green pill would make the rows that need nothing the loudest on screen.
//  2. Short labels. "Out for signature" and "Declined by a signer" belong on
//     the detail page, where there is one document and room to say it
//     properly; in a row they push the filename out.
//  3. No pulse. Motion only works while it's rare — twenty pinging dots is
//     noise, and twenty simultaneous animations for something non-urgent.
//
// Includes `draft`, which DOCUMENT_STATUS_PILL omits (the detail page shows a
// draft differently) but which is the most common state in any list.
export const LIST_STATUS_PILL: Record<
  string,
  { tone: StatusTone; dotTone?: StatusTone; label: string }
> = {
  draft: { tone: "gray", label: "Draft" },
  sent: { tone: "amber", label: "Sent" },
  completed: { tone: "gray", dotTone: "green", label: "Completed" },
  declined: { tone: "red", label: "Declined" },
  voided: { tone: "gray", label: "Voided" },
};

// A sealed document is still status "completed" underneath (the self-sign
// primitive reuses the ordinary documents/signers schema unmodified — see
// VERIFIED_BADGE_SCOPE.md's decision 6), so it can't get its own row in
// LIST_STATUS_PILL above, which is keyed by status alone. Same tone/dot as
// "completed", different, more accurate label. Shared across both list
// surfaces that show sealed documents alongside sent ones (2026-08-05,
// follow-up to VERIFIED_BADGE_DASHBOARD_SCOPE.md): dashboard/documents/
// page.tsx and dashboard/page.tsx's "Recent documents" card.
export const SEALED_LIST_PILL: { tone: StatusTone; dotTone?: StatusTone; label: string } = {
  tone: "gray",
  dotTone: "green",
  label: "Sealed",
};
