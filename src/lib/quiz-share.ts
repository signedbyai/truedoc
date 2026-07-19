// What goes out when someone shares their quiz result.
//
// The share used to carry only the image and the archetype's tagline — no link
// at all. The card has "Start for free at signedby.ai" painted into it, so the
// loop wasn't completely broken, but a recipient had to READ a domain off a
// picture and type it. Nothing to tap, and nothing attributable: anyone who did
// arrive looked identical to direct traffic, so "did the viral loop work" was
// unanswerable rather than merely disappointing.

const BASE_URL = "https://signedby.ai";

export const QUIZ_SHARE_SOURCE = "quiz-share";

// Tagged so shared traffic is distinguishable from the paid LinkedIn campaign
// (utm_source=linkedin) and from direct. AttributionCapture reads these
// site-wide and stores first-touch, so a share that eventually converts is
// traceable all the way to signup.
export function quizShareUrl(): string {
  return `${BASE_URL}/quiz?utm_source=${QUIZ_SHARE_SOURCE}&utm_medium=social&utm_campaign=signature-quiz`;
}

// The URL is folded into the share TEXT rather than passed as navigator.share's
// `url` field. Several platforms silently drop `url` when a file is attached —
// which is exactly this case, since the card image is the point of sharing.
// That failure is invisible in testing on a platform that honours it and total
// on one that doesn't, so the link goes somewhere it cannot be stripped.
export function quizShareText(tagline: string): string {
  return `${tagline}\n\n${quizShareUrl()}`;
}
