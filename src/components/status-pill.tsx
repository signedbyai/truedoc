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
  label,
  pulse = false,
  icon,
  className = "",
}: {
  tone: StatusTone;
  label: string;
  pulse?: boolean;
  // A check mark instead of the status dot — reads as more final than a
  // signer row, so it's used for the terminal "Completed" document state.
  icon?: "check";
  className?: string;
}) {
  const t = TONES[tone];
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
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none ${t.dot}`}
            aria-hidden
          />
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden />
        </span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden />
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
