// Pure content + scoring for the signature-personality quiz
// (src/app/quiz/page.tsx). Kept dependency-free (no DOM, no canvas) so the
// scoring logic is unit-testable on its own -- the page component is just a
// thin rendering layer over this.
//
// Each archetype maps to a real entry in SIGNATURE_STYLES
// (src/lib/signature-styles.ts) -- the exact same font library a signer
// picks from when they type their name to sign for real -- and to a real
// SignedBy feature, chosen so the connection reads as an observation about
// the persona rather than an ad: fast/impulsive signers get pointed at
// mobile card-mode, careful/detail-oriented signers get pointed at the
// audit trail, etc.

export type ArchetypeId = "free-spirit" | "old-money" | "efficient-executive" | "traditionalist";

export type Archetype = {
  id: ArchetypeId;
  title: string;
  tagline: string; // short line for the shareable result card
  description: string; // longer blurb for the on-screen result
  styleId: string; // SIGNATURE_STYLES id
  feature: { name: string; description: string; href: string };
};

// Order matters: used as the tie-break priority in scoreQuiz below (earlier
// wins ties), and as the fixed per-question answer order so every question
// lists the same four personas in the same position.
export const ARCHETYPE_ORDER: ArchetypeId[] = [
  "free-spirit",
  "old-money",
  "efficient-executive",
  "traditionalist",
];

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  "free-spirit": {
    id: "free-spirit",
    title: "The Free Spirit",
    tagline: "You sign wherever, however, whenever the mood strikes.",
    description:
      "Your signature is more vibe than procedure — it changes a little every time, and that's the point. You sign on your phone, on a counter, mid-conversation, wherever life happens to be.",
    styleId: "flowing",
    feature: {
      name: "Card mode for signing on your phone",
      description:
        "Since you're probably signing this on your phone anyway — SignedBy's mobile card mode swipes you through fields one at a time instead of making you pinch-zoom a whole page.",
      href: "/",
    },
  },
  "old-money": {
    id: "old-money",
    title: "The Old Money",
    tagline: "Deliberate, unhurried, and just a little theatrical.",
    description:
      "You don't rush a signature — it's practically a small ceremony. Full name, every time, with a flourish that's more refined than showy. You notice when something's been done properly.",
    styleId: "elegant",
    feature: {
      name: "Certificate of Completion",
      description:
        "You'll appreciate that every SignedBy document comes with a Certificate of Completion — a verifiable audit trail, so exactly who signed what, and when, is never in question.",
      href: "/verify",
    },
  },
  "efficient-executive": {
    id: "efficient-executive",
    title: "The Efficient Executive",
    tagline: "Done before you finished reading this sentence.",
    description:
      "You sign the way you do everything else — fast. Sometimes it's basically your initials. You've never once re-read a signature line before moving on, and honestly, why would you.",
    styleId: "casual",
    feature: {
      name: "AI-drafted documents",
      description:
        "You'll like this: describe what you need in plain language — a freelance agreement, an NDA, a waiver — and SignedBy drafts a starting point for you. No blank-page problem.",
      href: "/",
    },
  },
  traditionalist: {
    id: "traditionalist",
    title: "The Traditionalist",
    tagline: "The exact same signature since you were 18. No notes.",
    description:
      "Consistency is the whole point. Same signature, same pace, every single time, and you read every word before it gets anywhere near your name. If it can't be printed and kept, it doesn't quite feel official.",
    styleId: "classic",
    feature: {
      name: "A real downloadable PDF",
      description:
        "Every document you sign with SignedBy comes with an actual downloadable PDF — a permanent copy that's yours, not something locked behind someone else's login.",
      href: "/",
    },
  },
};

export type QuizOption = { label: string; archetype: ArchetypeId };
export type QuizQuestion = { id: string; prompt: string; options: QuizOption[] };

// 8 questions x 4 options, one option per archetype per question, always in
// ARCHETYPE_ORDER -- so scoring is just "count which archetype was picked
// most," see scoreQuiz below.
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "style",
    prompt: "When you sign something, you usually...",
    options: [
      { label: "Dash off a loose, flowing scrawl — barely legible, unmistakably yours", archetype: "free-spirit" },
      { label: "Take a beat and produce your best, most polished signature", archetype: "old-money" },
      { label: "Whatever's fastest — sometimes it's basically your initials", archetype: "efficient-executive" },
      { label: "The exact same careful signature you've used for years", archetype: "traditionalist" },
    ],
  },
  {
    id: "full-name-or-initials",
    prompt: "Full name, or initials?",
    options: [
      { label: "Depends on my mood, honestly", archetype: "free-spirit" },
      { label: "Full name, always — initials feel incomplete", archetype: "old-money" },
      { label: "Initials, whenever I can get away with it", archetype: "efficient-executive" },
      { label: "Full name, the same way, every single time", archetype: "traditionalist" },
    ],
  },
  {
    id: "speed",
    prompt: "How fast do you sign?",
    options: [
      { label: "However fast feels right in the moment", archetype: "free-spirit" },
      { label: "Unhurried — a signature should look intentional", archetype: "old-money" },
      { label: "As fast as humanly possible", archetype: "efficient-executive" },
      { label: "Steady, the same pace every time", archetype: "traditionalist" },
    ],
  },
  {
    id: "flourish",
    prompt: "Do you loop your L's — any extra flourish, underline, or dot?",
    options: [
      { label: "Always. It's basically an art form at this point", archetype: "free-spirit" },
      { label: "A subtle one — refined, not showy", archetype: "old-money" },
      { label: "No time for that", archetype: "efficient-executive" },
      { label: "The same small flourish I've always done", archetype: "traditionalist" },
    ],
  },
  {
    id: "where",
    prompt: "Where do you usually sign things?",
    options: [
      { label: "Wherever I happen to be — phone, counter, doesn't matter", archetype: "free-spirit" },
      { label: "Somewhere I can do it properly, seated, good pen", archetype: "old-money" },
      { label: "On my phone, between other things", archetype: "efficient-executive" },
      { label: "Printed out, if I can help it", archetype: "traditionalist" },
    ],
  },
  {
    id: "reading",
    prompt: "Someone hands you a contract. You...",
    options: [
      { label: "Get a feel for it and go with your gut", archetype: "free-spirit" },
      { label: "Read closely — details matter", archetype: "old-money" },
      { label: "Skim the important parts and sign", archetype: "efficient-executive" },
      { label: "Read every word, every time, no exceptions", archetype: "traditionalist" },
    ],
  },
  {
    id: "evolution",
    prompt: "Has your signature changed over the years?",
    options: [
      { label: "Constantly — it's still evolving", archetype: "free-spirit" },
      { label: "It evolved once, deliberately, into what it is now", archetype: "old-money" },
      { label: "No idea, never really thought about it", archetype: "efficient-executive" },
      { label: "Not once since I was a teenager", archetype: "traditionalist" },
    ],
  },
  {
    id: "handwriting",
    prompt: "Your handwriting in general is...",
    options: [
      { label: "Big, loose, and a little chaotic", archetype: "free-spirit" },
      { label: "Neat, deliberate, a bit old-fashioned", archetype: "old-money" },
      { label: "Small and quick — function over form", archetype: "efficient-executive" },
      { label: "Consistent, same every time, like a font", archetype: "traditionalist" },
    ],
  },
];

/**
 * Whichever archetype was picked most across the answers wins. Ties break
 * by ARCHETYPE_ORDER (earlier wins) -- deterministic rather than random, so
 * the same set of answers always produces the same result.
 */
export function scoreQuiz(answers: ArchetypeId[]): ArchetypeId {
  const counts: Record<ArchetypeId, number> = {
    "free-spirit": 0,
    "old-money": 0,
    "efficient-executive": 0,
    traditionalist: 0,
  };
  for (const answer of answers) counts[answer]++;

  let best: ArchetypeId = ARCHETYPE_ORDER[0];
  for (const id of ARCHETYPE_ORDER) {
    if (counts[id] > counts[best]) best = id;
  }
  return best;
}
