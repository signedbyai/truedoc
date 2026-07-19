"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

// What the signer sees while the PDF fetches and page 1 renders.
//
// This replaced a bare "Loading document…" in grey text. It is deliberately NOT
// a splash screen: it shows for exactly as long as the work takes and vanishes
// the instant page 1 is ready, which on a fast connection may be a few hundred
// milliseconds. A timed 2-3s splash was considered (Lemonade does one) and
// rejected — that's a native app covering real boot work, whereas on the web a
// timer is just a delay wearing a costume, and this codebase has a standing
// zero-added-steps rule for the signer flow. The signer is the one person who
// didn't choose to be here.
//
// Progress is read from real stages, not interpolated over time. It can only
// move when something has actually happened.

export type LoadStage = "fetching" | "parsing";

const STAGE_WIDTH: Record<LoadStage, string> = {
  // Deliberately starts well short of half: a bar that opens near the end has
  // nowhere to go and reads as stuck.
  fetching: "18%",
  parsing: "62%",
};

const STAGE_LABEL: Record<LoadStage, string> = {
  fetching: "Fetching the document",
  parsing: "Preparing the first page",
};

export function SignerLoading({
  orgName,
  stage,
  // Branding-tier orgs pay for the signer flow to look like theirs, so the
  // SignedBy mark is withheld from them here exactly as it is on the header and
  // the end screens. Their signer sees the sender's name and nothing else.
  showSignedByMark,
  logoUrl,
  delayMs = 150,
}: {
  orgName: string;
  stage: LoadStage;
  showSignedByMark: boolean;
  logoUrl?: string | null;
  delayMs?: number;
}) {
  // Held back briefly so a fast load goes straight to the document. A branded
  // panel that appears and disappears inside 100ms reads as a flicker, which is
  // worse than the plain text it replaced.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  if (!visible) return null;

  return (
    <div
      className="flex flex-col items-center gap-4 py-16"
      role="status"
      aria-live="polite"
      // The visible text is decorative progress detail; this is what a screen
      // reader should hear, once, rather than each stage change.
      aria-label="Loading document"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={orgName} className="h-9 w-auto max-w-[160px] rounded object-contain" />
      ) : showSignedByMark ? (
        <Logo withBeta={false} />
      ) : null}

      <div className="h-[3px] w-48 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-yellow-300 transition-[width] duration-500 ease-out"
          style={{ width: STAGE_WIDTH[stage] }}
        />
      </div>

      <div className="text-center">
        {/* The most useful thing during a load isn't our brand — it's
            confirmation the signer is in the right place, from a name they
            recognise. This is known before the PDF starts fetching. */}
        <p className="text-sm text-slate-700">Sent by {orgName}</p>
        <p className="mt-0.5 text-xs text-slate-400">{STAGE_LABEL[stage]}</p>
      </div>
    </div>
  );
}
