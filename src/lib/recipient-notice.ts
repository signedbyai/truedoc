// Ready-to-use recipient privacy-notice wording a Sender can include in the
// invite email SignedBy sends on their behalf. Senders are the controller of
// their recipients' personal data (see Terms of Service Section 4 and the
// Data Processing Addendum) and are responsible for telling recipients about
// SignedBy's audit-trail and engagement tracking. This is the suggested
// wording from the 2026-07 privacy assessment -- editable per document in
// the field editor, not legal advice.
//
// The page-view-tracking clause only applies to orgs entitled to that
// feature (Starter+, see plan.ts's `pageViewTracking`) -- a Free-plan
// sender's recipients aren't actually tracked per page, so the default text
// shouldn't claim they are. Callers pass `hasPageViewTracking` from
// `planHasFeature(orgPlan, "pageViewTracking")`.
export function defaultRecipientNotice(hasPageViewTracking: boolean): string {
  const tracking = hasPageViewTracking
    ? "may notify the sender when you open the document and how long you spend on each page"
    : "may notify the sender when you open the document";
  return (
    "This document is sent for electronic signature via SignedBy. For security and to provide a legally valid " +
    `audit trail, SignedBy records signing activity (including timestamps and technical data) and ${tracking}. ` +
    "Please contact the sender with any privacy questions."
  );
}
