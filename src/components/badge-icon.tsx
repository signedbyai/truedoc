import type { BadgeId } from "@/lib/workspace-stats";

// Inline SVG rather than emoji. Emoji would have been quicker and more
// instantly readable, but it renders as a different picture on every platform
// — a wizard hat on iOS is not the wizard hat on Windows — and this codebase
// has no emoji anywhere else, so it would have read as pasted in. These are
// drawn to sit at the same weight as the rest of the UI's line icons
// (currentColor, 1.6 stroke) and inherit colour from the badge chip.

const BASE = "h-5 w-5 shrink-0";

const COMMON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: BASE,
  "aria-hidden": true,
} as const;

// Paper plane — the first document leaving.
function FirstSendIcon() {
  return (
    <svg {...COMMON}>
      <path d="M21 3L10.5 13.5M21 3l-6.5 18-4-8.5L2 8.5 21 3z" />
    </svg>
  );
}

// Stacked pages — a habit forming.
function FindingFeetIcon() {
  return (
    <svg {...COMMON}>
      <path d="M8 3h8l4 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M16 3v4h4" />
      <path d="M6 7.5A2 2 0 0 0 4 9.5V19a2 2 0 0 0 2 2h9" />
    </svg>
  );
}

// Wizard hat — cone, brim, and a spark. The spark is what makes it read as a
// wizard hat rather than a traffic cone at 20px.
function SigningWizardIcon() {
  return (
    <svg {...COMMON}>
      <path d="M12 2.5L16.5 16h-9L12 2.5z" />
      <path d="M5 16h14a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z" />
      <path d="M18.5 4.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6z" />
    </svg>
  );
}

// Trophy — the top of the ladder.
function PaperworkSlayerIcon() {
  return (
    <svg {...COMMON}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5.5H5.5A1.5 1.5 0 0 0 4 7a3.5 3.5 0 0 0 3.5 3.5H8M16 5.5h2.5A1.5 1.5 0 0 1 20 7a3.5 3.5 0 0 1-3.5 3.5H16" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </svg>
  );
}

// Envelope — the empty state, before any badge is earned. Not a greyed-out
// wizard hat: a locked reward reads as a rebuke on an account that hasn't done
// anything wrong, it has just arrived.
function FirstStepIcon() {
  return (
    <svg {...COMMON}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </svg>
  );
}

const ICONS: Record<BadgeId, () => React.ReactElement> = {
  "first-send": FirstSendIcon,
  "finding-feet": FindingFeetIcon,
  "signing-wizard": SigningWizardIcon,
  "paperwork-slayer": PaperworkSlayerIcon,
};

export function BadgeIcon({ id }: { id: BadgeId }) {
  const Icon = ICONS[id];
  return <Icon />;
}

export { FirstStepIcon };

// Gift — the monthly prize draw. Matches the referral gift icon's language so
// the two "there's something in this for you" moments look related.
export function GiftIcon() {
  return (
    <svg {...COMMON} className="h-4 w-4 shrink-0 text-slate-400">
      <path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7" />
      <path d="M3 8h18v4H3zM12 8v12" />
      <path d="M12 8S10.5 4 8.5 4a2 2 0 0 0 0 4M12 8s1.5-4 3.5-4a2 2 0 0 1 0 4" />
    </svg>
  );
}
