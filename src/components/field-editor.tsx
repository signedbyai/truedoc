"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCreditPackPrice, type Currency } from "@/lib/currency";
import { findFreePosition } from "@/lib/field-geometry";
import { resizeField } from "@/lib/field-resize";
import { remapFieldSignerIds } from "@/lib/field-persist";
import { useSendSealTransition } from "@/components/send-seal-transition";
import { signerForArrivingSuggestion, signerForConfirmedSuggestion } from "@/lib/suggestion-binding";
import { matchFrequentSignerByName, type MatchableSigner } from "@/lib/frequent-signer-match";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { DuplicateDocumentButton } from "@/components/duplicate-document-button";
import { BookmarkIcon, MENU_ITEM_CLASS, SaveIcon, MailIcon, ClockIcon, ShieldIcon } from "@/components/ui/menu-item";
import { FIELD_TYPES, fieldDef, type FieldType } from "@/lib/field-types";
import { defaultRecipientNotice } from "@/lib/recipient-notice";
import { installMapUpsertPolyfill } from "@/lib/pdfjs-map-polyfill";
import { computeSignatureLayout, quantize, type SignatureLayout } from "@/lib/suggestion-shape";
import type { AIProvider } from "@/lib/ai-provider";
import { consoleAppUrl } from "@/lib/console-host";

type Field = {
  id: string;
  type: FieldType;
  page: number;
  x: number; // 0-1, normalized to page width
  y: number; // 0-1, normalized to page height
  width: number; // 0-1
  height: number; // 0-1
  required: boolean;
  signerId: string | null;
  // Set only on fields seeded from a template, before real recipients exist.
  // 0-based "recipient slot" — auto-bound to a real signerId as recipients
  // are added, in order. Meaningless once signerId is set.
  templateRole: number | null;
  // AI-detected purpose of a text field ("name"/"title"/"company"), or null.
  // Persisted; the signing view uses "name" to pre-fill the signer's name.
  purpose: string | null;
  // Client-only, never sent to the server: true for an AI-suggested field
  // the sender hasn't confirmed yet. Cleared (turning it into a normal
  // field) by clicking or dragging it; removed entirely by its "x" button,
  // same as any other field. See persist() — suggested fields are filtered
  // out of every save, so an unconfirmed suggestion can never reach the DB.
  suggested?: boolean;
  // Client-only: true only when this suggested field is the generic
  // top-right fallback shown because the document couldn't actually be
  // analyzed (no extractable text, or the AI call itself failed) — not a
  // real suggestion based on the document's content. Rendered with
  // different, more honest copy than a real suggestion (see the "Suggested"
  // vs "Placeholder" tag below) so the sender isn't misled into thinking
  // this reflects an actual read of the document.
  placeholder?: boolean;
  // Client-only, for FIELD_SUGGESTION_LEARNING_SCOPE.md's correction
  // logging. origX/origY/origRole freeze the AI's original proposal at the
  // moment a suggestion is created (~line 565 below) so the diff logged at
  // confirm/delete time is exact rather than reconstructed from whatever the
  // field's live x/y/signerId happen to be by then. wasAiSuggested survives
  // confirmField clearing `suggested` (that flag only means "still
  // pending"), so persist()'s sender-placed-field logging can tell a
  // genuinely manual field apart from an AI suggestion that's since been
  // accepted -- the latter is already fully logged at confirm time and must
  // not be logged again as if it were manually placed.
  origX?: number;
  origY?: number;
  origRole?: number | null;
  wasAiSuggested?: boolean;
};

type Recipient = {
  id: string;
  name: string;
  email: string;
  order_index: number;
  // Per-recipient authentication (Business tier, PER_RECIPIENT_AUTH_SCOPE.md)
  // — when true, this signer must clear a one-time email code before their
  // signing link opens the document.
  auth_required: boolean;
};

// Cycled by recipient index so each signer's fields are visually distinct.
const RECIPIENT_COLORS = [
  { border: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  { border: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  { border: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  { border: "border-rose-500", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
];

// Tiny inline lock glyph for the per-recipient authentication toggle on
// each chip below — not worth pulling into menu-item.tsx's shared icon set
// since it's the only non-menu-row icon in this file.
// Per-recipient auth lock icon has no hover state on mobile, so the tooltip
// that explains it there instead auto-shows once, ever, on the first
// recipient chip — same one-time "seen" pattern as the referral gift
// button's SEEN_KEY (referral-gift-button.tsx), just a separate key since
// they're unrelated discovery moments.
const LOCK_HINT_SEEN_KEY = "sb_lock_hint_seen";

// First-run editor walkthrough (2026-08-16, tester item #2). Same one-time
// localStorage gate as LOCK_HINT_SEEN_KEY above and the other *_INTRO_KEY /
// *_SEEN_KEY hints across the app — an established pattern, not a new one.
//
// This REPLACED a `showIntro` banner that listed all three steps at once, in
// text-xs, on every document until the first field was placed. The first
// external tester had that banner on screen, sent a document successfully,
// and still reported not realising they were meant to click the document to
// place a field — so "explain everything upfront and let them dismiss it" is
// a demonstrated failure here, not a hypothesis. The replacement says ONE
// thing at a time and derives which thing from what the sender has actually
// done, so it can't turn back into a wall of text.
const WALKTHROUGH_SEEN_KEY = "sb_editor_walkthrough_seen";

function LockIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3 shrink-0"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="9" rx="2" fill={filled ? "currentColor" : "none"} />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function recipientColor(recipients: Recipient[], signerId: string | null) {
  if (!signerId) return { border: "border-slate-400", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  const idx = recipients.findIndex((r) => r.id === signerId);
  return RECIPIENT_COLORS[idx % RECIPIENT_COLORS.length] ?? RECIPIENT_COLORS[0];
}

// <input type="datetime-local"> has no timezone of its own — its value is
// always "as if" the browser's local time, with no offset in the string
// ("2026-08-01T14:30"). These convert between that and the UTC ISO string
// documents.expires_at actually stores, both directions going through the
// Date object's own local-time getters/constructor so the conversion always
// matches whatever timezone the browser (and therefore the sender) is in.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

// Did the sender bind this field to a different recipient than the one the
// AI's role pointed at? Only meaningful when the AI actually tagged a role
// (origRole !== null) and the field ended up bound to a real recipient — an
// untagged suggestion or a still-unassigned field has no AI claim to have
// corrected. Module-level (not a method closing over component state) so it
// has a stable identity and doesn't need to be a useCallback dependency.
function computeRoleCorrected(
  origRole: number | null | undefined,
  finalSignerId: string | null,
  recipients: Recipient[]
): boolean {
  if (origRole == null || finalSignerId === null) return false;
  const bound = recipients.find((r) => r.id === finalSignerId);
  if (!bound) return false;
  return bound.order_index !== origRole;
}

export function FieldEditor({
  documentId,
  documentTitle,
  pageCount,
  hasPaymentCollection,
  hasDocGate,
  hasTemplates,
  hasPageViewTracking,
  autoSuggestOnUpload,
  initialPaymentLinkUrl,
  initialPaymentLabel,
  initialDocgateUrl,
  initialDocgateLabel,
  initialRecipientNotice,
  initialInviteSubject,
  initialInviteMessage,
  initialExpiresAt,
  cameFromConsole = false,
  consoleConversationId = null,
  isConsoleTemplatePreview = false,
  initialSignerName,
  initialSignerEmail,
  sendCapReached = false,
  currency = "USD",
}: {
  documentId: string;
  // Shown in the editor's own header — the immersive editor hides the shared
  // dashboard nav, so without this there's nothing on screen saying which
  // document you're editing.
  documentTitle: string;
  pageCount: number;
  hasPaymentCollection: boolean;
  hasDocGate: boolean;
  hasTemplates: boolean;
  // Whether this org's plan includes per-page engagement tracking (see
  // plan.ts) — determines whether the default recipient-notice wording
  // below claims page-dwell-time tracking that Free orgs don't actually do.
  hasPageViewTracking: boolean;
  // Org-wide preference (dashboard/settings), off by default — see
  // src/app/api/org/auto-suggest/route.ts. Only controls whether
  // suggestions run automatically on a brand-new document; the manual
  // "Suggest fields" button below always works regardless.
  autoSuggestOnUpload: boolean;
  initialPaymentLinkUrl: string | null;
  initialPaymentLabel: string | null;
  initialDocgateUrl: string | null;
  initialDocgateLabel: string | null;
  // documents.recipient_notice — null (never configured), '' (sender turned
  // it off), or the active notice text. See supabase/migrations/0027.
  initialRecipientNotice: string | null;
  // documents.invite_subject / invite_message — null means "use the
  // default" for each independently. See supabase/migrations/0029.
  initialInviteSubject: string | null;
  initialInviteMessage: string | null;
  // documents.expires_at (migration 0030) — null means no expiration.
  initialExpiresAt: string | null;
  // True only when this document was opened via Console's own
  // "Review fields" link after a multi-party upload (?from=console — see
  // dashboard/documents/[id]/page.tsx). Shows two small Console-specific
  // hints (direct ask, 2026-08-02): don't re-click Suggest while the first
  // run is still going, and the Save-as-Template name is prefilled to match
  // what Console itself expects. Defaults to false so every other path into
  // this page (a plain upload, AI Drafter, duplicate, template) is
  // unaffected.
  cameFromConsole?: boolean;
  // The specific console conversation this document was opened from
  // (?c=<id> alongside ?from=console — see dashboard/documents/[id]/page.tsx
  // and TEMPLATE_BROWSE_SCOPE.md). Only meaningful when cameFromConsole is
  // true. Used solely to make the floating "Back to Console" button below
  // reopen that exact conversation (console.signedby.ai/app?c=<id>) instead
  // of always landing on a blank new chat — see consoleAppUrl() call below.
  consoleConversationId?: string | null;
  // True only for a draft spawned by console-templates-list.tsx's "click a
  // template" action (?consoleTemplatePreview=1 — TEMPLATE_BROWSE_SCOPE.md
  // Option A, 2026-08-02) — the user clicked a template to look at/tweak
  // its fields, not to create a new document. Every "Back to Console" exit
  // point below best-effort DELETEs this draft first when true, so
  // browsing templates doesn't quietly accumulate rows in Documents. Safe
  // even if the user went ahead and actually sent this specific document
  // instead of just previewing it — DELETE /api/documents/[id] already
  // refuses anything past draft status, so a real send just makes the
  // discard attempt a harmless no-op (see that route's own guard).
  isConsoleTemplatePreview?: boolean;
  // Set only on the redirect from Magic Quote's finalize step (see
  // magic-quote-form.tsx's handleFinalize + documents/[id]/page.tsx's
  // ?signerName=/?signerEmail= searchParams), and only when the sender
  // actually typed a Bill To email there — a real customer email typed
  // moments ago is worth skipping the guided "Suggest fields" step for.
  // Null/undefined for every other path into this page (a plain upload, AI
  // Drafter, duplicate, or template), which behaves exactly as before. When
  // only a name was typed (no email), these stay unset on purpose — see the
  // showingDetectedSigners gate below, which now surfaces a single detected
  // party too, so that case is handled by the normal Suggest-fields flow
  // instead (the name reaches the AI via quote-to-pdf.ts's Print Name line).
  initialSignerName?: string | null;
  initialSignerEmail?: string | null;
  /** Server-computed at page load from getFreePlanUsage (2026-08-05, direct
   *  ask: "the behaviour should still be asking to upgrade when the user
   *  tries to upload number 4" — this is that same idea applied to Send,
   *  which is where the real cap now lives). Real enforcement is
   *  checkFreePlanSendCap inside POST /api/documents/[id]/send; this is a
   *  read-only, non-blocking courtesy check so a Free org that's already
   *  sent 3 documents this month sees the Upgrade modal the instant they
   *  click Send on this draft, without a wasted round trip. Can go stale
   *  within a single page visit (e.g. sending another document in a
   *  different tab) — harmless, since handleSend's real request always
   *  re-checks regardless of what this prop said. */
  sendCapReached?: boolean;
  /** Resolved visitor currency, for the same "Buy 25 more" credit-pack
   *  price display new-document-client.tsx's cap-hit card already shows —
   *  see that component's own prop doc. Threaded from
   *  dashboard/documents/[id]/page.tsx's getRequestCurrency() call. */
  currency?: Currency;
}) {
  const router = useRouter();
  const { trigger: triggerSendSealTransition } = useSendSealTransition();
  // Carries the originating conversation back with it (see
  // consoleConversationId's prop doc above) so console-workspace.tsx can
  // reopen the right chat instead of always landing on a blank one — the
  // one thing the floating "Back to Console" button below couldn't do
  // before this, since target="_blank" already keeps the original tab
  // alive but rel="noreferrer" blocks any programmatic way back to it.
  const backToConsoleUrl = consoleConversationId
    ? `${consoleAppUrl()}?c=${encodeURIComponent(consoleConversationId)}`
    : consoleAppUrl();
  // Fires before every Back to Console navigation below when this document
  // is just a template preview (see isConsoleTemplatePreview's prop doc).
  // Not awaited — keepalive lets the request finish in the background past
  // the window.location.href navigation that follows it immediately after,
  // same reasoning as console-chat.tsx's autosave fix (2026-08-02): a plain
  // fetch() would otherwise get aborted by the very navigation it's racing.
  function discardPreviewDraftIfAny() {
    if (!isConsoleTemplatePreview) return;
    fetch(`/api/documents/${documentId}`, { method: "DELETE", keepalive: true }).catch(() => {
      // Best-effort — worst case the draft just lingers in Documents,
      // same as it would have without this feature at all.
    });
  }
  const [selectedTool, setSelectedTool] = useState<FieldType | null>(null);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState(initialPaymentLinkUrl || "");
  const [paymentLabel, setPaymentLabel] = useState(initialPaymentLabel || "");
  const [showPaymentEditor, setShowPaymentEditor] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [docgateUrl, setDocgateUrl] = useState(initialDocgateUrl || "");
  const [docgateLabel, setDocgateLabel] = useState(initialDocgateLabel || "");
  const [showDocgateEditor, setShowDocgateEditor] = useState(false);
  const [savingDocgate, setSavingDocgate] = useState(false);
  const [docgateError, setDocgateError] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  // Mirrors of the two above, kept current via effect (not a direct
  // render-body assignment — react-hooks/refs flags that). confirmField is
  // called from onUp, a closure frozen at pointerdown time (see
  // handleFieldPointerDown) -- if a recipient chip is clicked and a drag
  // starts on its heels before React re-renders, confirmField's own
  // closed-over `recipients`/`activeRecipientId` could still be the
  // PREVIOUS values, causing the sole-recipient/role-match fallback in
  // signerForConfirmedSuggestion to resolve differently (or to null) than it
  // should -- the intermittent "field ended up unassigned" report
  // (2026-07-28), the same closure-staleness class of bug as the drag
  // snap-back fix above, just for signer resolution instead of position.
  const recipientsRef = useRef(recipients);
  useEffect(() => {
    recipientsRef.current = recipients;
  }, [recipients]);
  const activeRecipientIdRef = useRef(activeRecipientId);
  useEffect(() => {
    activeRecipientIdRef.current = activeRecipientId;
  }, [activeRecipientId]);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pageCanvases, setPageCanvases] = useState<{ page: number; dataUrl: string; width: number; height: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  // Pre-send "who signs where" sanity check — surfaced only when a recipient
  // has no fields to sign (the tell of a mis-placed or forgotten field).
  const [showSendReview, setShowSendReview] = useState(false);
  // Pre-send domain sanity check (BOUNCE_TRACKING_SCOPE.md) — a warning, not
  // a hard block like showSendReview above: the sender can send anyway, since
  // an unusual-but-real mail setup can look identical to a typo from here.
  // null = no warning pending; a non-empty array is the reasons to show.
  const [domainWarnings, setDomainWarnings] = useState<string[] | null>(null);
  // Free-plan send-cap-hit modal (2026-08-05) — same shape/copy as
  // new-document-client.tsx's cap-hit card, just rendered as a modal here
  // (matching this file's existing showSendReview/domainWarnings pattern)
  // since Send lives inline in a toolbar rather than at the bottom of a
  // single-purpose page. Set either by sendCapReached (the upload-time-
  // equivalent courtesy check, tripped instantly on Send) or by handleSend's
  // real request coming back with `upgrade: true`.
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  // Sender-editable privacy notice appended to the invite email (see
  // recipient-notice.ts + supabase/migrations/0027). Re-derived from
  // initialRecipientNotice on mount: '' means the sender explicitly turned
  // it off, anything else (including null) starts enabled with either the
  // sender's saved text or the suggested default.
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeEnabled, setNoticeEnabled] = useState(initialRecipientNotice !== "");
  const [noticeText, setNoticeText] = useState(
    initialRecipientNotice || defaultRecipientNotice(hasPageViewTracking)
  );
  // Sender-editable subject/message for the same invite email (see
  // supabase/migrations/0029) — shown in the same "Customize invite email"
  // modal as the notice above. Blank means "use the default" for each
  // independently, so unlike the notice there's no separate enabled flag.
  const [inviteSubject, setInviteSubject] = useState(initialInviteSubject || "");
  const [inviteMessage, setInviteMessage] = useState(initialInviteMessage || "");

  // Document expiration (see supabase/migrations/0030) — saved immediately
  // via its own endpoint, independent of Send, same pattern as the payment
  // link/DocGate settings below. isoToLocalInput/localInputToIso convert
  // between the stored UTC ISO string and the <input type="datetime-local">
  // value, which has no timezone of its own (it's implicitly the browser's).
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [expiresAtInput, setExpiresAtInput] = useState(isoToLocalInput(initialExpiresAt));
  const [savingExpiration, setSavingExpiration] = useState(false);
  const [expirationError, setExpirationError] = useState("");
  // Bulk on/off for per-recipient authentication — client state only, same
  // as the per-chip lock toggle (toggleAuthRequired below); only actually
  // persists on Save draft / Send, same as every other recipient edit.
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  // Pre-filled from documentTitle (2026-08-02, direct bug report), not
  // blank — was forcing every "Save as Template" to be typed from scratch,
  // which is how a console-uploaded multi-signer document (Console's own
  // inline save_as_template confirm only covers <=1 party — see
  // handleTemplateFileSelected's `parties.length >= 2` branch in
  // console-chat.tsx, which just links here with no name at all) ended up
  // saved under a name Console never actually proposed or knew about.
  // Normalized the exact same way console-chat.tsx's own `defaultName`
  // is (dashes/underscores -> spaces) so the two paths agree on a name
  // whenever the sender just accepts the default, instead of only when
  // Console happens to be the one offering it.
  const [templateName, setTemplateName] = useState(
    () => documentTitle.replace(/[-_]+/g, " ").trim() || "Untitled template"
  );
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState("");
  // Console-return flow (2026-08-02, direct ask) — a console-originated
  // session has no obvious "you're done, go back" moment: Save as Template
  // used to just close its modal and fade a toast, leaving the sender on
  // an unchanged screen with no signal the task was finished, and the
  // uploaded document itself is left behind as a separate, harmless draft
  // once save-as-template/route.ts creates its own independent templates
  // row. Three pieces below, all gated on cameFromConsole so every other
  // path into this page is unaffected:
  //  - templateSaved: has a save actually succeeded yet this session.
  //  - showBackToConsolePrompt: the front-and-center "you're done" popover,
  //    auto-shown right after a successful save.
  //  - showSaveReminderPrompt: shown instead of navigating away if the
  //    floating "Back to Console" button is clicked before templateSaved.
  const [templateSaved, setTemplateSaved] = useState(false);
  const [showBackToConsolePrompt, setShowBackToConsolePrompt] = useState(false);
  const [showSaveReminderPrompt, setShowSaveReminderPrompt] = useState(false);
  // Captured right before templateName resets to "" on success, so the
  // back-to-Console popover can still name what was just saved.
  const [lastSavedTemplateName, setLastSavedTemplateName] = useState("");
  // First-time-sender guidance — only relevant before any fields exist, so
  // it naturally disappears for every document after the first one, and
  // won't flash for a returning document that already has fields once the
  // initial fetch below resolves.
  const [fieldsLoaded, setFieldsLoaded] = useState(false);
  // Starts false so server and first client render agree (localStorage isn't
  // readable during SSR); the effect below turns it on for a sender who
  // hasn't seen it. See WALKTHROUGH_SEEN_KEY.
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  // Mobile-only overflow menu for secondary actions — on a phone the full
  // desktop button row (Back / Save / Suggest / Duplicate / Delete /
  // Template / Send) wrapped into 3-4 lines inside the *sticky* header,
  // which could swallow most of the viewport before the document even
  // started. Primary actions live in a fixed bottom bar instead (see the
  // end of the JSX), mirroring the signer side's thumb-reachable bar.
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // Forces the per-recipient-auth lock tooltip open once, on the first
  // recipient chip, so mobile visitors (no hover) get the same explanation
  // desktop gets for free. See the effect below and LOCK_HINT_SEEN_KEY.
  const [showLockHint, setShowLockHint] = useState(false);
  // "saved" is sticky until the next edit dirties the draft again — a pill
  // that flickers back to nothing reads as "it stopped saving".
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  // FIELD_SUGGESTION_LEARNING_SCOPE.md's shape descriptor for whatever the
  // most recent suggest-fields run found, computed once when suggestions
  // land (see runSuggestFields below) and reused by every logging hook
  // point rather than recomputed per field. `analyzed` mirrors `!unreadable`
  // — logging is skipped entirely for a document that couldn't actually be
  // analyzed (no shape to attribute a manual placement to, and nothing to
  // have been "suggested" in the first place). Fields not yet logged from a
  // sender-placed field are tracked separately (loggedSenderPlacedIdsRef
  // below) so persist() — which can run many times per editing session via
  // autosave — logs each one exactly once.
  const [suggestionShape, setSuggestionShape] = useState<{
    analyzed: boolean;
    layout: SignatureLayout;
    partyCount: number;
    columnCount: number | null;
    // Which AI provider/model produced this batch (see the suggest-fields
    // route) — lets suggestion_feedback rows be broken down by provider,
    // e.g. is Mistral's suggestion quality improving over time. Present
    // whenever the route resolved a provider at all, even for an unreadable
    // result — harmless since analyzed=false already skips logging there.
    provider: AIProvider | null;
    model: string | null;
  } | null>(null);
  const loggedSenderPlacedIdsRef = useRef<Set<string>>(new Set());

  // "We detected N signers" guided setup: the suggest-fields pass returns the
  // distinct signing parties it found (with human labels). When a fresh
  // document turns out to be multi-party, we surface those so the sender can
  // drop in an email per party and we create the recipients in role order —
  // which auto-binds the role-tagged field suggestions (see addDetectedSigners
  // + lib/suggestion-binding.ts).
  const [detectedParties, setDetectedParties] = useState<{ role: number; label: string }[]>([]);
  const [signerInputs, setSignerInputs] = useState<
    {
      role: number;
      label: string;
      name: string;
      email: string;
      title: string | null;
      company: string | null;
      // Phase 2 of the frequent-signers feature (frequent-signer-match.ts):
      // set only when the email below was auto-filled from an exact,
      // unambiguous name match against the org's saved contacts -- never
      // from the document's own text (see the comment on email below).
      // Cleared the moment the sender hand-edits the email, so the "matched"
      // indicator in the panel never claims a provenance that's gone stale.
      matchedFrequentSignerId: string | null;
    }[]
  >([]);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  // curX/curY track the live position as onMove updates it, synchronously,
  // independent of React's setFields/render timing — see confirmField's
  // liveOverride param for why this matters.
  const dragState = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    curX: number;
    curY: number;
  } | null>(null);
  // Guards the auto-suggest effect below to a single attempt per mount —
  // without this, any state change that re-runs the effect (e.g. the
  // suggestions themselves arriving) would re-trigger it in a loop.
  const autoSuggestAttempted = useRef(false);
  // Generation counter for runSuggestFields (2026-08-02, direct bug report:
  // duplicate fields after a console-originated upload). The auto-run fires
  // itself via a deferred microtask right when the review page opens; if a
  // sender who saw nothing yet (suggestions were still loading, not
  // actually broken) taps the toolbar's "Suggest fields" button in that
  // window, both calls are genuinely in flight at once. The manual call
  // (replaceExisting=true) correctly clears prior *suggested* fields before
  // adding its own batch — but if the auto call (replaceExisting=false)
  // resolves AFTER it, its own bail-out guard only checks for *confirmed*
  // fields, so it doesn't back off; it just appends its batch on top of the
  // manual one, producing the visible "double up." Each call now stamps the
  // generation it started at and checks it's still current before applying
  // (or clearing `suggesting` for) its own response — a response from a
  // superseded call is dropped outright instead of merging in.
  const suggestGenerationRef = useRef(0);
  // Same one-shot guard, for the initial-signer seeding effect below.
  const initialSignerSeeded = useRef(false);
  // Set right after any pointer interaction that started on an existing field
  // (a tap or a drag to move it), so the click the browser fires next doesn't
  // bubble to the page and drop a brand-new field on top — the "clicking a
  // placed field spawns a duplicate" bug. Checked and cleared in
  // handlePageClick.
  const suppressNextPageClick = useRef(false);
  // Mirrors "are there any confirmed fields" for runSuggestFields, which is a
  // useCallback that can't read the live `fields` without going stale — used
  // to decide whether suggestions were actually applied (and thus whether to
  // auto-scroll to them).
  const hasConfirmedRef = useRef(false);

  const confirmedFields = fields.filter((f) => !f.suggested);

  // Which single step the first-run walkthrough is currently on, derived from
  // what the sender has actually done rather than from a counter they click
  // through. That's the whole point of it: it can't get out of step with the
  // UI, it advances by itself when they do the thing, and there is never more
  // than one instruction on screen. null = all three done.
  //
  // The steps deliberately mirror the `next-step-highlight` glow that already
  // exists on the "+ Add recipient" button and the signature tool — the
  // walkthrough narrates the same sequence those were already pointing at,
  // rather than introducing a competing one. Step 3's visual counterpart is
  // the ring on the page itself (see the page container's className).
  const walkthroughStep: 1 | 2 | 3 | null =
    confirmedFields.length > 0 ? null : recipients.length === 0 ? 1 : selectedTool ? 3 : 2;
  // Whether the "This looks like it needs N signer(s)" panel is on screen.
  // Read by the panel itself and by the "+ Add recipient" glow, so the
  // guided cue can never point at the manual path while the guided one is
  // available. Covers single-party documents too (an invoice, a quote, a
  // one-signer contract) — this used to require 2+ detected parties, which
  // meant a lone detected party's name (and any frequent-signer email match)
  // was computed into signerInputs and then silently thrown away, forcing a
  // sender to retype it via manual "+ Add recipient" even though the AI had
  // already found it.
  const showingDetectedSigners = recipients.length === 0 && detectedParties.length >= 1;

  // Effective owner of a confirmed field: its assigned signer, or the sole
  // recipient when there's exactly one (an unassigned field still reaches that
  // single signer — see the send-time orphan guard). Used for the pre-send
  // "who signs where" check + review modal.
  // Still used by the send-review modal's per-recipient field count. The
  // companion `recipientsWithoutFields` that used to live here was removed
  // 2026-08-16: handleSend became its only consumer and now derives its own
  // over the arrays it is actually about to persist (see the comment there).
  const effectiveOwner = (f: Field) => f.signerId ?? (recipients.length === 1 ? recipients[0].id : null);

  // The recipient a newly-placed field will belong to — surfaced next to the
  // field tools ("Fields go to: ● Name") so it's obvious that picking a
  // recipient sets the context for the field chooser.
  const activeRecipientIndex = recipients.findIndex((r) => r.id === activeRecipientId);
  const activeRecipient = activeRecipientIndex >= 0 ? recipients[activeRecipientIndex] : null;
  const activeRecipientColor = activeRecipient ? RECIPIENT_COLORS[activeRecipientIndex % RECIPIENT_COLORS.length] : null;

  // Immersive editing mode: the field editor is a focused full-screen surface
  // with its own top toolbar and fixed bottom Save/Send bar. Flag the body so
  // the shared dashboard nav (sticky top bar + fixed bottom pill) hides while
  // it's mounted — otherwise the bottom pill covers "Send for signature" and
  // the top bars double up. Only the draft editor mounts this component; the
  // completed/sent detail views share the route but keep their nav.
  useEffect(() => {
    document.body.dataset.immersive = "1";
    return () => {
      delete document.body.dataset.immersive;
    };
  }, []);

  // Load existing recipients + fields.
  useEffect(() => {
    Promise.all([
      fetch(`/api/documents/${documentId}/signers`).then((r) => r.json()),
      fetch(`/api/documents/${documentId}/fields`).then((r) => r.json()),
    ])
      .then(([signersData, fieldsData]) => {
        if (Array.isArray(signersData.signers)) {
          const loaded: Recipient[] = signersData.signers.map(
            (s: { id: string; name: string | null; email: string; order_index: number; auth_required?: boolean }) => ({
              id: s.id,
              name: s.name || "",
              email: s.email,
              order_index: s.order_index,
              auth_required: s.auth_required ?? false,
            })
          );
          setRecipients(loaded);
          if (loaded.length > 0) setActiveRecipientId(loaded[0].id);
        }
        if (Array.isArray(fieldsData.fields)) {
          setFields(
            fieldsData.fields.map(
              (f: Omit<Field, "signerId" | "templateRole"> & { signer_id: string | null; template_role: number | null }) => ({
                ...f,
                signerId: f.signer_id,
                templateRole: f.template_role,
              })
            )
          );
        }
      })
      .catch(() => {})
      .finally(() => setFieldsLoaded(true));
  }, [documentId]);

  useEffect(() => {
    hasConfirmedRef.current = confirmedFields.length > 0;
  }, [confirmedFields.length]);

  // Bring a freshly-suggested field into view: the sender presses "Suggest
  // fields" from the top of the document, but suggestions almost always land
  // in the signature block near the bottom — without this they'd have to
  // hunt for them. Scrolls the topmost suggestion just below the sticky
  // toolbar. Scrolls to page-container + y offset, so it works whether or not
  // the field's own DOM node has painted yet.
  const scrollToDocPosition = useCallback((page: number, y: number) => {
    const container = pageRefs.current[page];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const target = window.scrollY + rect.top + y * rect.height - 180;
    window.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
  }, []);

  // --- Draft autosave ---------------------------------------------------
  // Confirmed fields and recipients used to live only in client state until
  // the sender hit Save or Send — so a failed send + reload (or just closing
  // the tab) silently discarded the work and could leave a stray duplicate
  // draft. This debounced autosave keeps the draft in the DB as the sender
  // edits. persist() remaps signer IDs on each save, which would otherwise
  // re-trigger this effect forever, so we compare on stable *content* (never
  // IDs) and skip when nothing meaningful changed since the last save.
  const lastSavedSigRef = useRef<string | null>(null);
  const autosaveInFlight = useRef(false);

  const draftSignature = useCallback(() => {
    const recips = [...recipients]
      .sort((a, b) => a.order_index - b.order_index)
      .map((r) => `${r.order_index}|${r.email.trim().toLowerCase()}|${(r.name || "").trim()}|${r.auth_required}`)
      .join(";");
    const flds = confirmedFields
      .map((f) => {
        const recip = recipients.find((r) => r.id === f.signerId);
        const who = recip ? recip.email.trim().toLowerCase() : f.templateRole !== null ? `role${f.templateRole}` : "none";
        return `${f.type}|${f.page}|${f.x.toFixed(4)}|${f.y.toFixed(4)}|${f.width.toFixed(4)}|${f.height.toFixed(4)}|${f.required}|${who}`;
      })
      .join(";");
    return `${recips}~${flds}`;
  }, [recipients, confirmedFields]);

  useEffect(() => {
    if (!fieldsLoaded) return;
    // Don't fight an in-progress manual save/send/template save.
    if (saving || sending || savingTemplate) return;
    // Nothing worth persisting yet — avoid creating empty churn on a
    // brand-new blank document.
    const hasContent = confirmedFields.length > 0 || recipients.some((r) => r.email.trim());
    if (!hasContent) return;
    // The signers PUT requires every recipient to have a valid email; while
    // one is mid-typed it would 400 and fail the whole persist. Just wait.
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (recipients.length > 0 && !recipients.every((r) => emailOk.test(r.email.trim()))) return;

    const sig = draftSignature();
    if (sig === lastSavedSigRef.current) return;

    const t = window.setTimeout(async () => {
      if (autosaveInFlight.current || saving || sending || savingTemplate) return;
      if (draftSignature() === lastSavedSigRef.current) return;
      autosaveInFlight.current = true;
      // Surface the autosave in the header. This ran silently before: the
      // draft WAS being saved as you edited, but nothing on screen said so,
      // so the only reassurance was pressing "Save draft" yourself.
      setSaveState("saving");
      try {
        const ok = await persist();
        if (ok) {
          lastSavedSigRef.current = sig;
          setSaveState("saved");
        } else {
          setSaveState("idle");
        }
      } finally {
        autosaveInFlight.current = false;
      }
    }, 1500);
    return () => window.clearTimeout(t);
    // persist is a stable-enough closure; depending on it would re-run every
    // render. The content deps below are what actually should trigger a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsLoaded, saving, sending, savingTemplate, recipients, confirmedFields, draftSignature]);

  // Render PDF pages to images via pdfjs-dist.
  useEffect(() => {
    let cancelled = false;

    async function render() {
      installMapUpsertPolyfill();
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.polyfill.mjs";

      const loadingTask = pdfjsLib.getDocument({ url: `/api/documents/${documentId}/file` });
      const pdf = await loadingTask.promise;
      const rendered: { page: number; dataUrl: string; width: number; height: number }[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        rendered.push({ page: pageNum, dataUrl: canvas.toDataURL(), width: viewport.width, height: viewport.height });
      }

      if (!cancelled) {
        setPageCanvases(rendered);
        setLoading(false);
      }
    }

    render().catch((err) => {
      console.error("Failed to render PDF", err);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // Fetches AI field-placement suggestions and merges them into local
  // state as unconfirmed ("suggested") fields — never written to the
  // server until the sender accepts one. Runs automatically once for a
  // brand-new document (see the effect below) and can also be re-run any
  // time via the toolbar's "Suggest fields" button or "Re-suggest"/
  // "Try again" in the banners below. `replaceExisting` is used by
  // "Suggest fields" and "Re-suggest" to swap out only the still-
  // unconfirmed suggestions (leaving anything the sender already confirmed
  // untouched); the initial auto-run and "Try again" after an error don't
  // need it since there's nothing to replace yet.
  const runSuggestFields = useCallback(
    async (replaceExisting = false) => {
      const myGeneration = ++suggestGenerationRef.current;
      setSuggesting(true);
      setSuggestError("");
      try {
        const res = await fetch(`/api/documents/${documentId}/suggest-fields`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't generate suggestions.");

        const suggestions: { page: number; type: FieldType; x: number; y: number; width: number; height: number; role: number | null; purpose: string | null }[] =
          Array.isArray(data.suggestions) ? data.suggestions : [];
        // True only when the document couldn't actually be analyzed (no
        // extractable text, or the AI call itself failed) — see
        // Field.placeholder and suggest-fields.ts's SuggestFieldsResult.
        const unreadable = Boolean(data.unreadable);

        // Topmost suggestion (first page, then highest up) — where we'll
        // scroll the sender once the batch lands.
        const topmost = suggestions.reduce<{ page: number; y: number } | null>(
          (best, s) => (!best || s.page < best.page || (s.page === best.page && s.y < best.y) ? { page: s.page, y: s.y } : best),
          null
        );
        // Suggestions are dropped only when this is a first run over a
        // document the sender has already placed fields on (guard below) —
        // mirror that here to decide whether to scroll.
        const willApply = replaceExisting || !hasConfirmedRef.current;
        // A newer run has since started — drop this response outright
        // rather than merging it in. See suggestGenerationRef's comment.
        const superseded = myGeneration !== suggestGenerationRef.current;

        setFields((prev) => {
          if (superseded) return prev;
          // If the sender started placing fields manually while this
          // request was in flight, don't clobber their work with stale
          // suggestions computed against an empty editor.
          if (!replaceExisting && prev.some((f) => !f.suggested)) return prev;

          const base = replaceExisting ? prev.filter((f) => !f.suggested) : prev;
          const newSuggested: Field[] = suggestions.map((s) => {
            // Bind role-tagged suggestions to recipients that ALREADY exist
            // (recipients-then-suggest order). addRecipient covers the
            // reverse order; without this, a "Party 1" suggestion stayed
            // orphaned forever when the recipient was added first — the
            // customer-reported "can't assign them to recipient" dead end
            // (2026-07-14, see lib/suggestion-binding.ts).
            const signerId = signerForArrivingSuggestion(s.role, recipients);
            return {
              id: `sugg-${crypto.randomUUID()}`,
              type: s.type,
              page: s.page,
              x: s.x,
              y: s.y,
              width: s.width,
              height: s.height,
              required: true,
              signerId,
              templateRole: signerId ? null : s.role,
              purpose: s.purpose,
              suggested: true,
              placeholder: unreadable,
              // Frozen at creation for FIELD_SUGGESTION_LEARNING_SCOPE.md's
              // correction logging — see the Field type's comment.
              origX: s.x,
              origY: s.y,
              origRole: s.role,
              wasAiSuggested: true,
            };
          });
          return [...base, ...newSuggested];
        });

        // Shape descriptor for this batch's logging — see the
        // suggestionShape state comment above. Computed from signature-type
        // suggestions only (the actual signature line per party, not a
        // scattered date/text field); skipped entirely for an unreadable
        // document, since there's no real suggestion attempt to compare
        // anything against (FIELD_SUGGESTION_LEARNING_SCOPE.md's "Narrowed"
        // decision).
        const signatureGeom = suggestions
          .filter((s) => s.type === "signature")
          .map((s) => ({ page: s.page, x: s.x, y: s.y, role: s.role }));
        const partyCountForShape = Array.isArray(data.parties) ? data.parties.length : 0;
        const shapeProvider: AIProvider | null =
          data.provider === "anthropic" || data.provider === "mistral" || data.provider === "deepseek"
            ? data.provider
            : null;
        const shapeModel: string | null = typeof data.model === "string" ? data.model : null;
        setSuggestionShape(
          unreadable
            ? { analyzed: false, layout: "unknown", partyCount: 0, columnCount: null, provider: shapeProvider, model: shapeModel }
            : {
                analyzed: true,
                partyCount: partyCountForShape,
                ...computeSignatureLayout(signatureGeom, partyCountForShape),
                provider: shapeProvider,
                model: shapeModel,
              }
        );

        // Capture the distinct signing parties the model found, for the
        // "we detected N signers" guided setup (rendered only when the
        // document is multi-party and no recipients exist yet).
        const parties: {
          role: number;
          label: string;
          name?: string | null;
          title?: string | null;
          company?: string | null;
        }[] = Array.isArray(data.parties) ? data.parties : [];
        setDetectedParties(parties);
        // Name is seeded from the document when it states one — the scan is
        // already reading the preamble and signature blocks, so asking the
        // sender to retype a name that's sitting in the text is wasted work.
        // Email is deliberately NEVER pre-filled from the document's own
        // text, even if one appears there: a name is visible and gets
        // checked, whereas a plausible-but-wrong email is the one mistake
        // here that sends the document to the wrong person, and nobody
        // re-reads a field that already looks filled in.
        //
        // Phase 2 exception: if a party's name is an exact, unambiguous
        // match against one of the org's own SAVED contacts (Settings >
        // Frequent signers — a much higher-confidence signal than arbitrary
        // document text, since the sender curated that list themselves),
        // pre-fill that contact's email too. Best-effort — a failed fetch
        // just means no matching happens this run, same as before this
        // feature existed. See lib/frequent-signer-match.ts.
        let frequentSigners: MatchableSigner[] = [];
        if (parties.some((p) => (p.name ?? "").trim())) {
          try {
            const fsRes = await fetch("/api/frequent-signers");
            const fsData = await fsRes.json().catch(() => ({}));
            if (Array.isArray(fsData.signers)) frequentSigners = fsData.signers;
          } catch {
            // best-effort, see comment above
          }
        }
        setSignerInputs(
          parties.map((p) => {
            const name = p.name ?? "";
            const match = name.trim() ? matchFrequentSignerByName(name, frequentSigners) : null;
            return {
              role: p.role,
              label: p.label,
              name,
              email: match?.email ?? "",
              title: p.title ?? null,
              company: p.company ?? null,
              matchedFrequentSignerId: match?.id ?? null,
            };
          })
        );

        // Scroll the sender to where the suggestions landed (usually the
        // signature block, off-screen below). Two rAFs so the new fields have
        // laid out first. Skipped when nothing was applied or there's nothing
        // meaningful to scroll to (e.g. a single top-of-page placeholder).
        // !superseded too — this response's fields were never applied (see
        // the setFields guard above), so its own topmost position no longer
        // corresponds to anything actually on screen.
        if (!superseded && willApply && topmost && !unreadable) {
          requestAnimationFrame(() => requestAnimationFrame(() => scrollToDocPosition(topmost.page, topmost.y)));
        }
      } catch (err) {
        if (myGeneration === suggestGenerationRef.current) {
          setSuggestError(err instanceof Error ? err.message : "Couldn't generate suggestions.");
        }
      } finally {
        // Only the latest generation should clear the loading state — if a
        // stale call's `finally` ran after a newer one had already started,
        // it would otherwise flip `suggesting` back to false while the
        // newer request is still genuinely in flight.
        if (myGeneration === suggestGenerationRef.current) setSuggesting(false);
      }
    },
    [documentId, recipients, scrollToDocPosition]
  );

  // Auto-run once for a completely untouched, brand-new document — not for
  // one that already has fields (from a template, a prior session, or an
  // earlier suggestion run) or recipients (a sender who's already deep into
  // editing doesn't want fields appearing out from under them). Off by
  // default now (autoSuggestOnUpload, an org-level Settings preference) —
  // going straight into AI-suggested-field mode before a sender has even
  // looked at the document made some senders uncomfortable, so this only
  // runs for orgs that have explicitly opted in. The manual "Suggest
  // fields" button works regardless of this setting either way.
  //
  // Also skipped when a Magic Quote Bill To recipient is about to be
  // seeded below (initialSignerEmail) — otherwise this effect and the
  // seeding effect could both fire off the same "recipients.length === 0"
  // render, since neither has committed its state update yet when the
  // other runs.
  useEffect(() => {
    if (!autoSuggestOnUpload) return;
    if (!fieldsLoaded || autoSuggestAttempted.current) return;
    if (fields.length > 0 || recipients.length > 0 || initialSignerEmail) return;
    autoSuggestAttempted.current = true;
    // Deferred a tick — runSuggestFields' first line is a setState call,
    // and calling that synchronously from within an effect body trips
    // react-hooks/set-state-in-effect. Same deferral pattern used
    // elsewhere in this file/signing-view.tsx for the same reason.
    Promise.resolve().then(() => runSuggestFields());
  }, [autoSuggestOnUpload, fieldsLoaded, fields.length, recipients.length, initialSignerEmail, runSuggestFields]);

  // Pre-fills the sole recipient from Magic Quote's Bill To fields (see
  // documents/[id]/page.tsx and magic-quote-form.tsx's handleFinalize) — a
  // Bill To email typed there arrives as ?signerName=/?signerEmail= on the
  // redirect into this page. Only fires when an email is present: a name
  // with no email is deliberately left for the normal "Suggest fields" flow
  // instead (see showingDetectedSigners above), since a bare name isn't
  // enough to safely create a real recipient. Same one-shot-on-a-clean-slate
  // gating as the auto-suggest effect above: never overwrites a recipient a
  // returning sender already added. Reuses addRecipient's exact Recipient
  // shape/order_index convention.
  useEffect(() => {
    if (!fieldsLoaded || initialSignerSeeded.current) return;
    if (recipients.length > 0 || !initialSignerEmail) return;
    initialSignerSeeded.current = true;
    const recipient: Recipient = {
      id: `new-${crypto.randomUUID()}`,
      name: (initialSignerName ?? "").trim(),
      email: initialSignerEmail.trim(),
      order_index: 0,
      auth_required: false,
    };
    // Deferred a tick -- same react-hooks/set-state-in-effect workaround as
    // the auto-suggest effect above.
    Promise.resolve().then(() => {
      setRecipients([recipient]);
      setActiveRecipientId(recipient.id);
    });
  }, [fieldsLoaded, recipients.length, initialSignerName, initialSignerEmail]);

  // Auto-shows the per-recipient-auth lock tooltip once, ever, the first
  // time a recipient exists — covers mobile, which has no hover state to
  // discover it otherwise. Gated on the localStorage flag rather than
  // recipients.length itself, so it doesn't re-fire on every document that
  // happens to be a visitor's first with a recipient.
  useEffect(() => {
    if (recipients.length === 0) return;
    let alreadySeen = true;
    try {
      alreadySeen = window.localStorage.getItem(LOCK_HINT_SEEN_KEY) === "1";
      if (!alreadySeen) window.localStorage.setItem(LOCK_HINT_SEEN_KEY, "1");
    } catch {
      alreadySeen = true;
    }
    if (alreadySeen) return;
    let timeoutId: number | undefined;
    // Deferred via Promise.resolve().then(...) — same
    // react-hooks/set-state-in-effect workaround used elsewhere in this
    // file (see the auto-suggest effect) and in signer-auth-gate.tsx.
    Promise.resolve().then(() => {
      setShowLockHint(true);
      timeoutId = window.setTimeout(() => setShowLockHint(false), 4000);
    });
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipients.length > 0]);

  // Turns the first-run walkthrough on for a sender who hasn't seen it. Waits
  // for fieldsLoaded so it never flashes on a returning document that already
  // has fields (same reasoning as fieldsLoaded's own comment). The "seen" flag
  // is written on dismissal/completion rather than here, so closing the tab
  // mid-way doesn't burn it.
  useEffect(() => {
    if (!fieldsLoaded) return;
    let alreadySeen = true;
    try {
      alreadySeen = window.localStorage.getItem(WALKTHROUGH_SEEN_KEY) === "1";
    } catch {
      alreadySeen = true;
    }
    if (alreadySeen) return;
    // Deferred a tick — same react-hooks/set-state-in-effect workaround as
    // the lock-hint effect above.
    Promise.resolve().then(() => setShowWalkthrough(true));
  }, [fieldsLoaded]);

  function dismissWalkthrough() {
    setShowWalkthrough(false);
    try {
      window.localStorage.setItem(WALKTHROUGH_SEEN_KEY, "1");
    } catch {
      // storage disabled — it'll just offer itself again next visit, harmless
    }
  }

  // Completing all three steps counts as having seen it, same as skipping.
  // Without this the flag is never written on the success path, so someone who
  // did everything right would be walked through it again on their next
  // document — the one person who has clearly proved they don't need it.
  useEffect(() => {
    if (!showWalkthrough || walkthroughStep !== null) return;
    Promise.resolve().then(dismissWalkthrough);
  }, [showWalkthrough, walkthroughStep]);

  // Builds the recipient currently sitting uncommitted in the "+ Add
  // recipient" form, along with the `recipients` and `fields` arrays that
  // committing it produces.
  //
  // Deliberately PURE — it sets no state. handleSend needs both to commit the
  // recipient AND to use the resulting arrays within the same tick, and
  // setRecipients/setFields don't take effect until the next render, so
  // reading state back after committing would silently see the OLD arrays.
  // Persisting a stale `fields` array is the exact mechanism behind the three
  // CRITICAL null-signer_id bugs in this file's history, so the committing
  // path and the reading path are derived from one function here rather than
  // written twice and left to drift.
  function buildPendingRecipient(): {
    recipient: Recipient;
    nextRecipients: Recipient[];
    nextFields: Field[];
  } | null {
    const email = newEmail.trim();
    if (!email) return null;
    const roleClaimed = recipients.length;
    const recipient: Recipient = {
      id: `new-${crypto.randomUUID()}`,
      name: newName.trim(),
      email,
      order_index: roleClaimed,
      auth_required: false,
    };
    return {
      recipient,
      nextRecipients: [...recipients, recipient],
      // Claim any template-seeded fields waiting for this recipient slot —
      // roles are numbered in the order recipients were added, both when a
      // template was saved and here when it's reused.
      nextFields: fields.map((f) =>
        f.signerId === null && f.templateRole === roleClaimed
          ? { ...f, signerId: recipient.id, templateRole: null }
          : f
      ),
    };
  }

  // Applies what buildPendingRecipient computed and clears the form. Sets the
  // arrays by value rather than with the functional form the two setters used
  // before: the values ARE this render's arrays plus the new recipient, and
  // handleSend relies on them matching what it goes on to persist.
  function commitPendingRecipient(built: NonNullable<ReturnType<typeof buildPendingRecipient>>) {
    setRecipients(built.nextRecipients);
    setFields(built.nextFields);
    setActiveRecipientId(built.recipient.id);
    setNewName("");
    setNewEmail("");
    setShowAddRecipient(false);
  }

  function addRecipient() {
    const built = buildPendingRecipient();
    if (!built) return;
    commitPendingRecipient(built);
  }

  function removeRecipient(id: string) {
    setRecipients((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, order_index: i })));
    setFields((prev) => prev.map((f) => (f.signerId === id ? { ...f, signerId: null } : f)));
    setActiveRecipientId((prev) => (prev === id ? null : prev));
  }

  function toggleAuthRequired(id: string) {
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, auth_required: !r.auth_required } : r)));
  }

  // Bulk version of the above, driven by the "Verification" menu item's
  // modal — sets every current recipient to the same value in one go. Still
  // just client state; individual chips can be fine-tuned afterward the
  // same as always.
  function setAllAuthRequired(value: boolean) {
    setRecipients((prev) => prev.map((r) => ({ ...r, auth_required: value })));
  }

  function updateSignerInput(role: number, field: "name" | "email", value: string) {
    setSignerInputs((prev) =>
      prev.map((s) =>
        s.role === role
          ? // Hand-editing the email clears the "matched a saved contact"
            // provenance flag — see the field's doc comment above.
            { ...s, [field]: value, ...(field === "email" ? { matchedFrequentSignerId: null } : null) }
          : s
      )
    );
  }

  // Creates a recipient for each detected party the sender gave an email to,
  // in role order so order_index === role — which is exactly how role-tagged
  // suggestions bind (signerForArrivingSuggestion). Only offered from a clean
  // slate (recipients.length === 0), so this replaces the empty list; the
  // field-claim pass then routes each "Party N" suggestion to its recipient.
  function addDetectedSigners() {
    const toAdd = signerInputs.filter((s) => s.email.trim()).sort((a, b) => a.role - b.role);
    if (toAdd.length === 0) return;
    const created: Recipient[] = toAdd.map((s) => ({
      id: `new-${crypto.randomUUID()}`,
      name: s.name.trim(),
      email: s.email.trim(),
      order_index: s.role,
      auth_required: false,
    }));
    setRecipients(created);
    setActiveRecipientId(created[0].id);
    setFields((prev) =>
      prev.map((f) => {
        if (f.signerId === null && f.templateRole !== null) {
          const match = created.find((r) => r.order_index === f.templateRole);
          if (match) return { ...f, signerId: match.id, templateRole: null };
        }
        return f;
      })
    );
    setDetectedParties([]);
    setSignerInputs([]);
  }

  const placeField = useCallback(
    (page: number, clickXFraction: number, clickYFraction: number) => {
      if (!selectedTool) return;
      const def = fieldDef(selectedTool);
      const x = Math.min(Math.max(clickXFraction - def.width / 2, 0), 1 - def.width);
      const y = Math.min(Math.max(clickYFraction - def.height / 2, 0), 1 - def.height);
      setFields((prev) => {
        const free = findFreePosition(page, x, y, def.width, def.height, prev);
        const newField: Field = {
          id: `new-${crypto.randomUUID()}`,
          type: selectedTool,
          page,
          x: free.x,
          y: free.y,
          width: def.width,
          height: def.height,
          required: true,
          signerId: activeRecipientId,
          templateRole: null,
          purpose: null,
        };
        return [...prev, newField];
      });
    },
    [selectedTool, activeRecipientId]
  );

  function handlePageClick(e: React.MouseEvent<HTMLDivElement>, page: number) {
    if (!selectedTool) return;
    // A click that came from interacting with an existing field (drag/tap)
    // shouldn't drop a new one — see suppressNextPageClick.
    if (suppressNextPageClick.current) {
      suppressNextPageClick.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    placeField(page, xFrac, yFrac);
  }

  // Fire-and-forget POST for FIELD_SUGGESTION_LEARNING_SCOPE.md's Phase 1
  // logging — never awaited by a caller, never blocks the editor. The server
  // (see /api/suggestion-feedback/route.ts) always responds 200 regardless
  // of what it actually did with the row (rate-limited, org opted out,
  // insert failed) — there is nothing for the client to react to either way.
  function logSuggestionFeedback(payload: {
    origin: "ai_suggested" | "sender_placed";
    fieldType: FieldType;
    layout: SignatureLayout;
    partyCount: number;
    columnCount: number | null;
    pageFractionX: number;
    pageFractionY: number;
    outcome: "kept" | "moved" | "deleted" | "role_changed" | null;
    moved: boolean;
    roleCorrected: boolean;
    deltaX: number | null;
    deltaY: number | null;
    provider: AIProvider | null;
    model: string | null;
  }) {
    fetch("/api/suggestion-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Best-effort only — see FIELD_SUGGESTION_LEARNING_SCOPE.md.
    });
  }

  // Confirming a suggestion should mean the same thing everywhere: clear
  // `suggested`, snapping away from anything it now overlaps. Used by all
  // three ways to confirm one — tapping it in place, dragging it, and the
  // explicit ✓ button — so they can never disagree with each other.
  //
  // `liveOverride` is passed only by a drag release (handleFieldPointerDown's
  // onUp). It exists because this callback's own `fields` closure can be
  // stale mid-drag: onUp is defined once, at pointerdown, so the confirmField
  // reference it calls (and that reference's own closed-over `fields`) is
  // whatever existed BEFORE the drag's onMove updates landed — reading
  // current.x/y here without the override silently re-confirmed the field at
  // its PRE-drag position (a real regression shipped 2026-07-27, fixed
  // 2026-07-28). A plain tap or the ✓ button has no such staleness (nothing
  // moved beforehand), so they call this with no override and current.x/y is
  // already correct.
  //
  // Also the single hook point for logging an ai_suggested correction (see
  // FIELD_SUGGESTION_LEARNING_SCOPE.md) — reads `fields` directly (rather
  // than only inside the setFields updater) so the precomputed signerId/free
  // position can be reused for the log payload right after, without
  // duplicating the resolution logic. This handler also runs on every drag
  // release of an ALREADY-confirmed field (see handleFieldPointerDown), so
  // logging is gated on `current.suggested` — only an actual suggestion
  // transitioning to confirmed is a loggable correction.
  const confirmField = useCallback(
    (id: string, liveOverride?: { x: number; y: number }) => {
      const current = fields.find((f) => f.id === id);
      if (!current) return;
      const liveX = liveOverride?.x ?? current.x;
      const liveY = liveOverride?.y ?? current.y;
      const others = fields.filter((f) => f.id !== id);
      const free = findFreePosition(current.page, liveX, liveY, current.width, current.height, others);
      // Confirming also resolves ownership for a still-unassigned
      // suggestion — selected chip first (same semantics as manual
      // placement), then role match, then sole recipient. Previously this
      // kept signerId null + templateRole set, which walked straight into
      // the send-time orphan block with no way to fix it besides deleting
      // the field (see lib/suggestion-binding.ts).
      // Read via the ref mirrors, not the closed-over recipients/
      // activeRecipientId directly — see the recipientsRef/
      // activeRecipientIdRef declaration for why (the same
      // frozen-at-pointerdown-time closure problem the liveOverride above
      // fixes for position, here for signer resolution instead).
      const signerId =
        current.signerId ??
        signerForConfirmedSuggestion({
          templateRole: current.templateRole,
          activeRecipientId: activeRecipientIdRef.current,
          recipients: recipientsRef.current,
        });

      setFields((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, x: free.x, y: free.y, suggested: false, signerId, templateRole: signerId ? null : f.templateRole }
            : f
        )
      );

      if (current.suggested && suggestionShape?.analyzed) {
        const origX = current.origX ?? current.x;
        const origY = current.origY ?? current.y;
        const dx = free.x - origX;
        const dy = free.y - origY;
        // A tiny findFreePosition nudge on a plain tap-to-confirm (no real
        // drag) shouldn't count as "moved" — only a deliberate reposition.
        const moved = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
        const roleCorrected = computeRoleCorrected(current.origRole, signerId, recipientsRef.current);
        logSuggestionFeedback({
          origin: "ai_suggested",
          fieldType: current.type,
          layout: suggestionShape.layout,
          partyCount: suggestionShape.partyCount,
          columnCount: suggestionShape.columnCount,
          pageFractionX: quantize(origX, 0.1),
          pageFractionY: quantize(origY, 0.1),
          outcome: roleCorrected ? "role_changed" : moved ? "moved" : "kept",
          moved,
          roleCorrected,
          deltaX: moved ? quantize(dx, 0.02, -1, 1) : null,
          deltaY: moved ? quantize(dy, 0.02, -1, 1) : null,
          provider: suggestionShape.provider,
          model: suggestionShape.model,
        });
      }
    },
    [fields, suggestionShape]
  );

  // Pointer Events (not mouse-only) so this works for touch/iOS drags too,
  // not just a mouse. touch-none on the field div (below) stops the browser
  // from treating the drag as a page-scroll gesture.
  function handleFieldPointerDown(e: React.PointerEvent, field: Field) {
    e.stopPropagation();
    dragState.current = {
      id: field.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: field.x,
      origY: field.y,
      curX: field.x,
      curY: field.y,
    };

    function onMove(moveEvent: PointerEvent) {
      const drag = dragState.current;
      if (!drag) return;
      const container = pageRefs.current[field.page];
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = (moveEvent.clientX - drag.startX) / rect.width;
      const dy = (moveEvent.clientY - drag.startY) / rect.height;
      const nextX = Math.min(Math.max(drag.origX + dx, 0), 1 - field.width);
      const nextY = Math.min(Math.max(drag.origY + dy, 0), 1 - field.height);
      // Kept in sync here, synchronously, alongside the visual setFields
      // update below — see onUp for why confirmField needs this rather than
      // its own `fields` snapshot.
      drag.curX = nextX;
      drag.curY = nextY;
      setFields((prev) => prev.map((f) => (f.id === drag.id ? { ...f, x: nextX, y: nextY } : f)));
    }

    function onUp() {
      const drag = dragState.current;
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      // This interaction started on a field, so the click the browser fires
      // next (e.g. when a drag ends over empty space with a tool armed) must
      // not reach the page and place a duplicate field. The field div also
      // stops its own click, so this only matters for a drag that releases
      // off the field.
      suppressNextPageClick.current = true;
      if (!drag) return;

      // Any pointer interaction with a suggested field — a tap-in-place or
      // a drag to nudge it — counts as the sender reviewing and accepting
      // it, so this also clears `suggested` here rather than needing a
      // separate confirm control. Goes through the same confirmField() as
      // the ✓ button and plain taps, so all three ways to confirm a
      // suggestion end up in an identical end state.
      //
      // Passes the live-tracked (curX, curY) explicitly rather than letting
      // confirmField fall back to its own `fields` snapshot: this handler
      // (onMove/onUp) is defined once, at pointerdown, and confirmField's
      // closure over `fields` is whatever it was AT THAT MOMENT — before any
      // of this drag's onMove updates landed. Without this override,
      // confirmField would recompute the "free" position from the field's
      // PRE-drag coordinates and silently confirm it back there, even
      // though the drag visually moved it — the exact regression this
      // fixes (2026-07-28).
      confirmField(drag.id, { x: drag.curX, y: drag.curY });
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // Drag a corner handle to resize a field — the opposite corner stays put.
  // Separate from handleFieldPointerDown (which moves the whole field);
  // stopPropagation keeps a handle grab from also starting a move. Math lives
  // in lib/field-resize.ts (unit tested).
  function handleResizePointerDown(e: React.PointerEvent, field: Field, corner: { left: boolean; top: boolean }) {
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY };
    const orig = { x: field.x, y: field.y, width: field.width, height: field.height };
    // Grab the page container off the DOM (the handle lives inside it) rather
    // than pageRefs — keeps this handler ref-free so react-hooks/refs doesn't
    // flag it when it's wired up from inside the nested handles map.
    const container = (e.currentTarget as HTMLElement).closest("[data-page-canvas]");

    function onMove(moveEvent: PointerEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = (moveEvent.clientX - start.x) / rect.width;
      const dy = (moveEvent.clientY - start.y) / rect.height;
      const next = resizeField({ corner, orig, dx, dy });
      setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, ...next } : f)));
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      // Don't let the trailing click drop a new field when a tool is armed.
      suppressNextPageClick.current = true;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function removeField(id: string) {
    const current = fields.find((f) => f.id === id);
    setFields((prev) => prev.filter((f) => f.id !== id));

    // Rejected outright — only loggable when it was still an unconfirmed
    // suggestion at the moment of removal (see
    // FIELD_SUGGESTION_LEARNING_SCOPE.md hook point 2). A confirmed field
    // being deleted later is just ordinary editing, not a correction signal.
    if (current?.suggested && suggestionShape?.analyzed) {
      const origX = current.origX ?? current.x;
      const origY = current.origY ?? current.y;
      logSuggestionFeedback({
        origin: "ai_suggested",
        fieldType: current.type,
        layout: suggestionShape.layout,
        partyCount: suggestionShape.partyCount,
        columnCount: suggestionShape.columnCount,
        pageFractionX: quantize(origX, 0.1),
        pageFractionY: quantize(origY, 0.1),
        outcome: "deleted",
        moved: false,
        roleCorrected: false,
        deltaX: null,
        deltaY: null,
        provider: suggestionShape.provider,
        model: suggestionShape.model,
      });
    }
  }

  // Saves recipients first (so we have real signer ids), remaps fields to
  // point at those ids, then saves fields. Returns false on failure —
  // including a network-level throw, so callers never leave a spinner stuck
  // (see handleSend) and autosave can quietly retry on the next change.
  // The two overrides exist for handleSend's auto-commit path: a recipient
  // committed in the same tick is not yet visible in `recipients`/`fields`
  // (React re-renders afterwards), so that caller passes the arrays it just
  // computed. Every other caller — autosave, handleSaveDraft — omits them and
  // gets current state, exactly as before. Do NOT reintroduce direct reads of
  // `recipients`/`fields` inside this function: saving a stale `fields` array
  // is what caused all three CRITICAL null-signer_id bugs in this file.
  async function persist(recipientsOverride?: Recipient[], fieldsOverride?: Field[]): Promise<boolean> {
    const srcRecipients = recipientsOverride ?? recipients;
    const srcFields = fieldsOverride ?? fields;
    try {
      let savedRecipients = srcRecipients;
      // old recipient id -> new (server-assigned) id. Declared out here so the
      // fields payload below can be remapped too — NOT just the React state.
      // Missing that remap silently nulled every field's signer_id on save
      // (the saved fields still had old ids, which never match the freshly
      // re-inserted recipients), so multi-recipient docs went out with the
      // fields assigned to nobody and each signer saw an empty document.
      const oldToNew = new Map<string, string>();

      if (srcRecipients.length > 0) {
        const res = await fetch(`/api/documents/${documentId}/signers`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signers: srcRecipients.map((r) => ({
              name: r.name || null,
              email: r.email,
              order_index: r.order_index,
              auth_required: r.auth_required,
            })),
          }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        const returned: { id: string; email: string }[] = data.signers ?? [];

        // Match by array position (single batch insert preserves order); fall
        // back to email match if that ever isn't true.
        srcRecipients.forEach((r, i) => {
          const match = returned[i]?.email === r.email ? returned[i] : returned.find((x) => x.email === r.email);
          if (match) oldToNew.set(r.id, match.id);
        });

        savedRecipients = srcRecipients.map((r) => ({ ...r, id: oldToNew.get(r.id) ?? r.id }));
        setRecipients(savedRecipients);
        setActiveRecipientId((prev) => (prev ? oldToNew.get(prev) ?? prev : prev));
        setFields((prev) =>
          prev.map((f) => (f.signerId ? { ...f, signerId: oldToNew.get(f.signerId) ?? f.signerId } : f))
        );
      }

      // Unconfirmed AI suggestions are never persisted — "nothing is final
      // until the sender confirms it" (see the Field.suggested comment).
      // Remap each field's signer to its new recipient id (see field-persist.ts
      // — skipping this nulled every assignment on multi-recipient docs).
      const validRecipientIds = new Set(savedRecipients.map((r) => r.id));
      const currentFields = remapFieldSignerIds(
        srcFields.filter((f) => !f.suggested),
        oldToNew,
        validRecipientIds
      );

      const res = await fetch(`/api/documents/${documentId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: currentFields.map(({ type, page, x, y, width, height, required, signerId, templateRole, purpose }) => ({
            type,
            page,
            x,
            y,
            width,
            height,
            required,
            signer_id: signerId,
            template_role: templateRole,
            purpose,
          })),
        }),
      });

      // Hook point 4 (FIELD_SUGGESTION_LEARNING_SCOPE.md): a truly
      // sender-placed field (never an AI suggestion at all — see
      // Field.wasAiSuggested) is the only way to see a false negative, a
      // spot the AI should have suggested but didn't. Only logged when the
      // document was actually analyzed (suggestionShape.analyzed — skips the
      // unreadable-fallback case, which has no shape to attribute this to
      // and no real suggestion attempt to compare against), and only once
      // ever per field id, since persist() runs repeatedly via autosave.
      if (res.ok && suggestionShape?.analyzed) {
        for (const f of currentFields) {
          if (f.wasAiSuggested) continue;
          if (loggedSenderPlacedIdsRef.current.has(f.id)) continue;
          loggedSenderPlacedIdsRef.current.add(f.id);
          logSuggestionFeedback({
            origin: "sender_placed",
            fieldType: f.type,
            layout: suggestionShape.layout,
            partyCount: suggestionShape.partyCount,
            columnCount: suggestionShape.columnCount,
            pageFractionX: quantize(f.x, 0.1),
            pageFractionY: quantize(f.y, 0.1),
            outcome: null,
            moved: false,
            roleCorrected: false,
            deltaX: null,
            deltaY: null,
            provider: suggestionShape.provider,
            model: suggestionShape.model,
          });
        }
      }

      return res.ok;
    } catch {
      // Network-level failure (e.g. a transient "Failed to fetch"). Treat as
      // a save failure so the caller can surface it and re-enable its button.
      return false;
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    setStatusMessage("");
    const sig = draftSignature();
    const ok = await persist();
    if (ok) lastSavedSigRef.current = sig; // keep autosave from re-firing
    setStatusMessage(ok ? "Saved." : "Couldn't save — try again.");
    setSaving(false);
  }

  async function handleSend(forceDespiteDomainWarnings = false) {
    if (sendCapReached) {
      setShowUpgradeModal(true);
      return;
    }
    // A recipient typed into the "+ Add recipient" form but never committed
    // with the small "Add" button is still sitting in newName/newEmail and has
    // never reached `recipients`. Before 2026-08-16 that fell straight through
    // to the "Add at least one recipient" message below — baffling when the
    // address you just typed is still visible on screen. Reported by the first
    // external tester (item #1) as: "you type your email, click Send, does not
    // work; you have to bring the focus out of the email field before Send
    // works." The blur was a red herring: leaving the field is simply what
    // prompted them to click Add. Nothing about focus was ever involved.
    //
    // Commit it for them rather than making them click twice. THE ARRAYS
    // BUILT HERE ARE USED FOR THE REST OF THIS FUNCTION — commitPendingRecipient
    // only queues setState, so `recipients`/`fields`/`confirmedFields` and
    // every value derived from them still hold the pre-commit arrays until the
    // next render. Reading those below would silently drop the recipient we
    // just added, and persisting a stale `fields` array is the exact mechanism
    // behind the three CRITICAL null-signer_id bugs in this file's history.
    // Everything downstream therefore uses sendRecipients/sendFields, and
    // persist() takes them as arguments instead of closing over state.
    let sendRecipients = recipients;
    let sendFields = fields;
    if (showAddRecipient && newEmail.trim()) {
      // Auto-commit is deliberately stricter than the "Add" button, which
      // accepts any non-empty string. Clicking Add is an explicit "yes, this
      // person" — inferring it from a Send click is not, so an address that
      // isn't even shaped like one gets queried rather than quietly turned
      // into a recipient the sender never confirmed. Same rough shape check
      // as checkBillToEmailOnBlur (magic-quote-form.tsx); the send route
      // still does the real domain validation afterwards either way.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
        setStatusMessage(
          `"${newEmail.trim()}" doesn't look like an email address — check it, then send.`
        );
        return;
      }
      const built = buildPendingRecipient();
      if (built) {
        commitPendingRecipient(built);
        sendRecipients = built.nextRecipients;
        sendFields = built.nextFields;
      }
    }
    // Local re-derivations over the arrays above, mirroring confirmedFields
    // and effectiveOwner as they're defined near the top of the component
    // against live state. Keep them structurally identical to those — if one
    // changes, change both.
    const sendConfirmedFields = sendFields.filter((f) => !f.suggested);
    const sendEffectiveOwner = (f: Field) =>
      f.signerId ?? (sendRecipients.length === 1 ? sendRecipients[0].id : null);
    const sendRecipientsWithoutFields = sendRecipients.filter(
      (r) => !sendConfirmedFields.some((f) => sendEffectiveOwner(f) === r.id)
    );

    if (sendRecipients.length === 0) {
      setStatusMessage("Add at least one recipient before sending.");
      return;
    }
    if (sendConfirmedFields.length === 0) {
      setStatusMessage("Place at least one field before sending.");
      return;
    }
    // A confirmed field with no signer is only safe to send when there's a
    // single recipient and the field was never tagged for a specific party
    // (see visibleFieldsForSigner) — that's the common "didn't bother
    // selecting the recipient chip" case, and it still reaches that one
    // recipient fine. Anything else (a "Party 2"-tagged field nobody ever
    // claimed, or an unassigned field when there's more than one recipient)
    // would otherwise either vanish for every signer or, worse, bleed onto
    // the wrong one — block the send and say so instead of shipping that.
    const orphanedFields = sendConfirmedFields.filter(
      (f) => f.signerId === null && (f.templateRole !== null || sendRecipients.length > 1)
    );
    if (orphanedFields.length > 0) {
      setStatusMessage(
        `${orphanedFields.length} field${orphanedFields.length === 1 ? " isn't" : "s aren't"} assigned to a ` +
          `recipient — remove ${orphanedFields.length === 1 ? "it" : "them"} and re-place ${
            orphanedFields.length === 1 ? "it" : "them"
          } with a recipient selected above (or add the missing recipient) before sending.`
      );
      return;
    }
    // Every recipient must have a field to sign — a signer with none would just
    // consent to an empty document, which can quietly complete the whole thing
    // without them actually signing (the reported bug). Show the who-signs-where
    // review as a HARD block, not an override. The send route enforces the same.
    if (sendRecipientsWithoutFields.length > 0) {
      setShowSendReview(true);
      return;
    }
    setSending(true);
    setStatusMessage("");
    const ok = await persist(sendRecipients, sendFields);
    if (!ok) {
      setStatusMessage("Couldn't save — check your connection and try again.");
      setSending(false);
      return;
    }
    try {
      const res = await fetch(`/api/documents/${documentId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientNotice: noticeEnabled ? noticeText.trim() : "",
          inviteSubject: inviteSubject.trim(),
          inviteMessage: inviteMessage.trim(),
          confirmDomainWarnings: forceDespiteDomainWarnings,
        }),
      });
      const data = await res.json().catch(() => ({}));
      // The send route returns this instead of actually sending when a
      // recipient's domain looks invalid and confirmDomainWarnings wasn't
      // set — nothing has gone out yet, so show it and let the sender
      // decide, rather than silently sending into a likely bounce.
      if (res.ok && Array.isArray(data.domainWarnings) && data.domainWarnings.length > 0 && !forceDespiteDomainWarnings) {
        setDomainWarnings(data.domainWarnings);
        setSending(false);
        return;
      }
      if (res.ok) {
        // Popover-then-navigate (2026-08-05) instead of a bare router.push
        // — see send-seal-transition.tsx. sending stays true (never reset
        // below on this path) so the button stays disabled through the
        // transition, same as before.
        triggerSendSealTransition("sent", "/dashboard");
        return;
      }
      // checkFreePlanSendCap's 402 (plan.ts) — the real, authoritative cap
      // check, same shape sendCapReached's early-bail above short-circuits
      // for. Reachable even when sendCapReached was false at page load
      // (e.g. sent 3 in another tab since) — same real-error-vs-upsell
      // split as new-document-client.tsx's showUpgrade.
      if (data.upgrade) {
        setShowUpgradeModal(true);
        setSending(false);
        return;
      }
      setStatusMessage(data.error || "Couldn't send — try again.");
      setSending(false);
    } catch {
      // A transient network failure previously left the button stuck on
      // "Sending…" with no error and no retry — only a reload recovered.
      // Surface it and re-enable so the sender can just tap Send again.
      setStatusMessage("Couldn't send — check your connection and try again.");
      setSending(false);
    }
  }

  // Same two options as new-document-client.tsx's cap-hit card, same
  // POST-then-redirect shape, `source: "dashboard"` for the same
  // cross-subdomain-cancel_url reason (2026-08-05).
  async function upgradeToPro() {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "starter", source: "dashboard" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't start checkout — try again.");
      window.location.href = data.url;
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Something went wrong.");
      setUpgradeLoading(false);
    }
  }

  async function buyCreditPack() {
    setCreditsLoading(true);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "dashboard" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't start checkout — try again.");
      window.location.href = data.url;
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Something went wrong.");
      setCreditsLoading(false);
    }
  }

  async function handleSaveAsTemplate() {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    setTemplateError("");
    const ok = await persist(); // make sure the DB has the latest fields/recipients before reading them back
    if (!ok) {
      setTemplateError("Couldn't save — try again.");
      setSavingTemplate(false);
      return;
    }
    try {
      const res = await fetch(`/api/documents/${documentId}/save-as-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save as a template.");
      }
      setShowSaveTemplateModal(false);
      setLastSavedTemplateName(templateName.trim());
      setTemplateName("");
      setTemplateSaved(true);
      // The front-and-center popover below replaces the plain toast for a
      // console-originated session — a fading "Saved as template." was the
      // exact non-signal that left the sender wondering what to do next.
      if (cameFromConsole) {
        setShowBackToConsolePrompt(true);
      } else {
        setStatusMessage("Saved as template.");
      }
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function savePayment() {
    setSavingPayment(true);
    setPaymentError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_link_url: paymentLinkUrl.trim(), payment_label: paymentLabel.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the payment link.");
      setShowPaymentEditor(false);
      setStatusMessage(paymentLinkUrl.trim() ? "Payment link saved." : "Payment link removed.");
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingPayment(false);
    }
  }

  async function saveDocgate() {
    setSavingDocgate(true);
    setDocgateError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/docgate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docgate_url: docgateUrl.trim(), docgate_label: docgateLabel.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the DocGate link.");
      setShowDocgateEditor(false);
      setStatusMessage(docgateUrl.trim() ? "DocGate link saved." : "DocGate link removed.");
    } catch (err) {
      setDocgateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingDocgate(false);
    }
  }

  async function saveExpiration() {
    setSavingExpiration(true);
    setExpirationError("");
    try {
      const iso = localInputToIso(expiresAtInput);
      const res = await fetch(`/api/documents/${documentId}/expiration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expires_at: iso }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the expiration date.");
      setShowExpirationModal(false);
      setStatusMessage(iso ? "Expiration date saved." : "Expiration date removed.");
    } catch (err) {
      setExpirationError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingExpiration(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        {/* Editor header — desktop only. The immersive editor hides the shared
            dashboard nav (see the data-immersive effect above), which left the
            sender with no branding, no document name and no way out. This
            restores all three without bringing the full nav back, which is
            what caused the doubled bars and the bottom pill covering "Send".
            Not rendered on mobile: there the document is the scarce resource,
            and the compact strip below already carries Back + Send. */}
        <div className="hidden items-center gap-3 px-6 py-2 sm:flex">
          <Link href="/dashboard" className="shrink-0 hover:opacity-80">
            <Logo withBeta={false} />
          </Link>
          <span aria-hidden className="text-slate-300">
            |
          </span>
          <span className="min-w-0 truncate text-sm text-slate-600" title={documentTitle}>
            {documentTitle}
          </span>
          {saveState !== "idle" && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                saveState === "saving" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
              )}
            >
              {saveState === "saving" ? "Saving…" : <>✓ Saved</>}
            </span>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link
              href="/dashboard/documents"
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              ← Documents
            </Link>
            <div className="relative">
              {/* size="sm" + rounded-lg across the header trio (More / Send /
                  Suggest) — the default h-10 buttons read heavy next to the
                  slim header and the segmented control. */}
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setShowMoreMenu((v) => !v)}>
                More ⌄
              </Button>
              {/* Menu rows, not a stack of outline buttons. The buttons had no
                  common width — the two self-contained components sized to
                  their own text while the inline ones stretched — so the menu
                  read as four unrelated controls with a ragged right edge.
                  Shared MENU_ITEM_CLASS is what keeps them identical. */}
              {showMoreMenu && (
                <>
                  {/* Invisible full-screen scrim behind the menu — click
                      anywhere outside to dismiss, same technique
                      referral-gift-button.tsx already uses. Previously the
                      only way to close this was pressing the More button
                      again, which read as broken. z-20 sits below the
                      menu's z-30 so the menu itself stays clickable. */}
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setShowMoreMenu(false)}
                    className="fixed inset-0 z-20 cursor-default"
                  />
                  <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                    <button
                      onClick={() => {
                        handleSaveDraft();
                        setShowMoreMenu(false);
                      }}
                      disabled={saving || sending}
                      className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                    >
                      <SaveIcon />
                      {saving ? "Saving…" : "Save draft"}
                    </button>
                    <DuplicateDocumentButton
                      documentId={documentId}
                      asMenuItem
                      onSelect={() => setShowMoreMenu(false)}
                    />
                    {hasTemplates ? (
                      <button
                        onClick={() => {
                          setTemplateError("");
                          setShowSaveTemplateModal(true);
                          setShowMoreMenu(false);
                        }}
                        disabled={saving || sending || confirmedFields.length === 0}
                        className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                      >
                        <BookmarkIcon />
                        Save as template
                      </button>
                    ) : (
                      // Was a bare <a> in 12px grey, which looked like a broken
                      // row rather than a locked feature. Same row shape as the
                      // rest, with the tier as a badge.
                      <a
                        href="/pricing"
                        className={cn(MENU_ITEM_CLASS, "text-slate-400 hover:bg-slate-50")}
                      >
                        <BookmarkIcon />
                        Save as template
                        <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                          Pro+
                        </span>
                      </a>
                    )}
                    {/* Available on every plan — subject/message personalization
                        and the privacy-disclosure notice are both compliance/
                        communication tools, not a productivity upsell, so this
                        isn't gated like the row above it. */}
                    <button
                      onClick={() => {
                        setShowNoticeModal(true);
                        setShowMoreMenu(false);
                      }}
                      className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                    >
                      <MailIcon />
                      Customize invite email
                    </button>
                    {/* Also ungated — a timestamp column plus a check in the
                        cron job that already runs the reminder sweep, not a
                        new piece of infrastructure, so there's no cost basis
                        for a plan gate here either. */}
                    <button
                      onClick={() => {
                        setExpirationError("");
                        setShowExpirationModal(true);
                        setShowMoreMenu(false);
                      }}
                      className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                    >
                      <ClockIcon />
                      Document expiration
                    </button>
                    {/* Bulk on/off for the per-recipient lock toggles below —
                        disabled with nobody to apply it to yet, same
                        disabled-until-ready treatment as "Save as template"
                        above. */}
                    <button
                      onClick={() => {
                        setShowVerificationModal(true);
                        setShowMoreMenu(false);
                      }}
                      disabled={recipients.length === 0}
                      className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                    >
                      <ShieldIcon />
                      Verification
                    </button>
                    {/* Destructive action last, below a rule — it previously sat
                        one slip away from Send in the flat row. */}
                    <div className="my-1 border-t border-slate-100" />
                    <DeleteDocumentButton
                      documentId={documentId}
                      redirectTo="/dashboard/documents"
                      asMenuItem
                      onSelect={() => setShowMoreMenu(false)}
                    />
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={() => handleSend()}
              disabled={saving || sending}
              size="sm"
              variant="cta"
              className="rounded-lg"
            >
              {sending ? "Sending…" : "Send for signature →"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {/* Mobile-only compact action strip. No logo/title bar here — at
              this width the document is the scarce resource — but the autosave
              pill rides along in the space that already exists, so mobile
              still gets the same reassurance desktop does without a new row.
              "Suggest" is shortened so it fits beside More without wrapping.

              Sits FIRST, above the field-type control, matching the mockup and
              desktop: navigation and document status are the outer frame, the
              field tools are content inside it. Ordered in the DOM rather than
              with CSS `order` so tab order still matches what you see. On
              desktop this whole strip is hidden, so its position here is inert
              and the sm:flex-row layout below is unchanged. */}
          <div className="flex items-center justify-between gap-2 sm:hidden">
            <button
              onClick={() => router.push("/dashboard")}
              className="shrink-0 text-sm font-medium text-slate-500"
            >
              ← Back
            </button>
            {saveState !== "idle" && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  saveState === "saving" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
                )}
              >
                {saveState === "saving" ? "Saving…" : "✓ Saved"}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="ai-comet"
                onClick={() => runSuggestFields(true)}
                disabled={suggesting}
              >
                {suggesting ? "Suggesting…" : "Suggest"}
              </Button>
              {/* Label stays "More ⋯" even while open — it used to flip to
                  "Close", which read like it might close the whole document
                  rather than just this menu, especially once the menu below
                  became a full overlay with its own explicit "Done". */}
              <Button variant="outline" size="sm" onClick={() => setShowMoreMenu((v) => !v)}>
                More ⋯
              </Button>
            </div>
          </div>

          {/* One horizontally-swipeable row on mobile (no wrapping — every
              wrapped line here is document space lost to the sticky
              header); wraps normally from sm: up. */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {/* Segmented control rather than five separate pills: these are
                mutually-exclusive modes, so they should read as one control
                with a selected segment. Also narrower, which buys back room
                on mobile where this row scrolls. */}
            <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-200">
            {FIELD_TYPES.map((f, fi) => {
              // Draws the eye straight to the first thing a brand-new
              // document needs, in case the dismissible banner below gets
              // skipped past. Was the signer side's subtle blue pulse
              // (too easy to miss here), briefly a red pulse + orbiting
              // orange trail (too alarm-like) — now an on-brand yellow
              // highlighter sweep across the label, echoing both the
              // favicon (black S on yellow highlight) and how people mark
              // "sign here" on paper. See .next-step-highlight in
              // globals.css.
              // Only glow the field tools once there's a recipient to assign a
              // field to — the guided order is "add who signs" first (that
              // button glows when there are none), THEN "pick a field".
              // fields.length (not confirmedFields.length) — the glow was
              // checking only CONFIRMED fields, so it kept sweeping the
              // whole time AI suggestions sat on the page unconfirmed (they
              // don't count as confirmed until individually accepted). The
              // point of the glow is "you haven't placed anything yet";
              // once suggestions have landed, something IS there for the
              // sender to review, so it should stop.
              const isNextStep =
                f.type === "signature" &&
                fieldsLoaded &&
                fields.length === 0 &&
                recipients.length > 0 &&
                !selectedTool;
              return (
                <button
                  key={f.type}
                  onClick={() => setSelectedTool(selectedTool === f.type ? null : f.type)}
                  className={cn(
                    "shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors",
                    fi > 0 && "border-l border-slate-200",
                    selectedTool === f.type
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {isNextStep ? <span className="next-step-highlight">{f.label}</span> : f.label}
                </button>
              );
            })}
            </div>

            {/* Persistent context: which recipient a placed field belongs to.
                Makes "select a recipient to set the field context" visible
                instead of implicit. Colored to match that recipient's chip +
                field boxes. */}
            {recipients.length > 0 && (
              <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap pl-1 text-xs text-slate-400">
                <span aria-hidden>→</span>
                {activeRecipient && activeRecipientColor ? (
                  <>
                    Fields go to:
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                        activeRecipientColor.border,
                        activeRecipientColor.bg,
                        activeRecipientColor.text
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", activeRecipientColor.dot)} />
                      {activeRecipient.name || activeRecipient.email}
                    </span>
                  </>
                ) : (
                  <span className="italic">Select a recipient below to place their fields</span>
                )}
              </span>
            )}
          </div>
          {/* Second row keeps only the AI action (plus any transient status).
              Back / Save draft / Duplicate / Save as template / Delete / Send
              all moved up into the header above — seven equal-weight outline
              buttons became one primary, one AI action and a "More" menu. */}
          <div className="hidden flex-wrap items-center gap-2 sm:flex sm:gap-3">
            {statusMessage && <span className="text-sm text-slate-500">{statusMessage}</span>}
            <Button
              variant="outline"
              size="sm"
              className="ai-comet rounded-lg"
              onClick={() => runSuggestFields(true)}
              disabled={suggesting}
            >
              {/* Sparkle marks this as the AI action at a glance — it was the
                  one button whose nature you had to read the label to learn.
                  Filled yellow (not currentColor) so it carries the same brand
                  accent as the glow on the button's edge. Inline SVG, same
                  approach as the rest of the codebase. */}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 text-yellow-500"
                aria-hidden
              >
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM18 16l.7 1.8L20.5 18.5l-1.8.7L18 21l-.7-1.8L15.5 18.5l1.8-.7L18 16z" />
              </svg>
              {suggesting ? "Suggesting…" : "Suggest fields"}
            </Button>
          </div>

        </div>

        {/* Same running order as the desktop dropdown: Save draft, Duplicate,
            Save as template, then Delete alone below a rule. It previously ran
            Save draft / Duplicate / Delete / Save as template, so the
            destructive action landed in the middle of the grid — next to
            Duplicate, and directly under Save draft — with nothing marking it
            apart. Two menus for the same feature disagreeing on where Delete
            lives is how people delete the wrong thing.

            Was rendered inline in normal document flow, which shoved the
            whole document down every time it opened, and the trigger button
            up top flipped between "More ⋯" and "Close" — easy to misread as
            "close this document" rather than "close this menu". Now a real
            bottom sheet: fixed to the viewport (so it floats over the
            document instead of reflowing it) with a dimmed scrim behind it,
            same tap-outside-to-dismiss as the desktop menu, plus an explicit
            "Done" in the sheet's own header so there's never an ambiguous
            top-bar label to misread. z-20/z-30 mirrors the desktop scrim/
            menu pair, both above the fixed bottom Save/Send bar's z-10. */}
        {showMoreMenu && (
          <>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setShowMoreMenu(false)}
              className="fixed inset-0 z-20 bg-black/30 sm:hidden"
            />
            <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-slate-200 bg-white pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-4px_16px_rgba(0,0,0,0.12)] sm:hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-medium text-slate-900">More</span>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Done
                </button>
              </div>
              {/* Same rows as desktop, one column. The two-column button grid it
                  replaces cost roughly twice the height for the same four
                  actions — on a phone that came straight out of the document. */}
              <div className="px-2 py-1.5">
                <button
                  onClick={() => {
                    handleSaveDraft();
                    setShowMoreMenu(false);
                  }}
                  disabled={saving || sending}
                  className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                >
                  <SaveIcon />
                  {saving ? "Saving…" : "Save draft"}
                </button>
                <DuplicateDocumentButton
                  documentId={documentId}
                  asMenuItem
                  onSelect={() => setShowMoreMenu(false)}
                />
                {hasTemplates ? (
                  <button
                    onClick={() => {
                      setTemplateError("");
                      setShowSaveTemplateModal(true);
                      setShowMoreMenu(false);
                    }}
                    disabled={saving || sending || confirmedFields.length === 0}
                    className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                  >
                    <BookmarkIcon />
                    Save as template
                  </button>
                ) : (
                  <a href="/pricing" className={cn(MENU_ITEM_CLASS, "text-slate-400 hover:bg-slate-50")}>
                    <BookmarkIcon />
                    Save as template
                    <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                      Pro+
                    </span>
                  </a>
                )}
                <button
                  onClick={() => {
                    setShowNoticeModal(true);
                    setShowMoreMenu(false);
                  }}
                  className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                >
                  <MailIcon />
                  Customize invite email
                </button>
                <button
                  onClick={() => {
                    setExpirationError("");
                    setShowExpirationModal(true);
                    setShowMoreMenu(false);
                  }}
                  className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                >
                  <ClockIcon />
                  Document expiration
                </button>
                <button
                  onClick={() => {
                    setShowVerificationModal(true);
                    setShowMoreMenu(false);
                  }}
                  disabled={recipients.length === 0}
                  className={cn(MENU_ITEM_CLASS, "text-slate-700 hover:bg-slate-50")}
                >
                  <ShieldIcon />
                  Verification
                </button>
                <div className="my-1 border-t border-slate-100" />
                <DeleteDocumentButton
                  documentId={documentId}
                  redirectTo="/dashboard/documents"
                  asMenuItem
                  onSelect={() => setShowMoreMenu(false)}
                />
              </div>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5 sm:px-6">
          <span className="text-xs font-medium text-slate-500">Recipients:</span>
          {recipients.map((r, i) => {
            const color = RECIPIENT_COLORS[i % RECIPIENT_COLORS.length];
            return (
              <button
                key={r.id}
                onClick={() => setActiveRecipientId(r.id)}
                className={cn(
                  "group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  activeRecipientId === r.id
                    ? `${color.border} ${color.bg} ${color.text}`
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", color.dot)} />
                {r.name || r.email}
                {/* group/lock scopes the CSS hover so only THIS chip's
                    tooltip shows, not every chip's at once. Was a native
                    `title` attribute — the unstyled browser tooltip was
                    hard to read; this is a small custom bubble styled like
                    the rest of the app instead (same white/border/shadow
                    language as the refer-a-friend popover, just sized down
                    since it's one line with no actions). i === 0 also wires
                    in showLockHint, which force-shows this same bubble once
                    on mobile, where there's no hover to discover it. */}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAuthRequired(r.id);
                  }}
                  className={cn(
                    "group/lock relative ml-0.5 inline-block px-0.5",
                    r.auth_required ? "text-amber-600" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <LockIcon filled={r.auth_required} />
                  <span
                    className={cn(
                      "pointer-events-none absolute left-1/2 top-full z-40 mt-1.5 hidden w-48 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 text-[11px] font-normal normal-case leading-snug text-slate-600 shadow-lg group-hover/lock:block",
                      showLockHint && i === 0 && "block"
                    )}
                  >
                    {r.auth_required
                      ? "Verification required before signing — click to remove"
                      : "Require a one-time email code before this signer can open the document"}
                  </span>
                </span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecipient(r.id);
                  }}
                  // Always visible — this was `hidden group-hover:inline`,
                  // which made removing a recipient literally impossible on
                  // touch devices (no hover state to reveal it). px-1 pads
                  // the tap target a little without changing the look.
                  className="ml-0.5 inline px-1 text-slate-400 hover:text-red-500"
                >
                  ×
                </span>
              </button>
            );
          })}

          {showAddRecipient ? (
            // flex-wrap + flexible input widths so this fits a phone-width
            // row instead of the fixed w-32/w-44 pair overflowing it.
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (optional)"
                className="h-7 w-28 min-w-0 flex-1 text-xs sm:w-32 sm:flex-none"
              />
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                className="h-7 w-40 min-w-0 flex-1 text-xs sm:w-44 sm:flex-none"
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
              />
              <button onClick={addRecipient} className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                Add
              </button>
              <button onClick={() => setShowAddRecipient(false)} className="text-xs text-slate-400 hover:text-slate-600">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRecipient(true)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
            >
              {/* First step of the guided flow: glow "add a recipient" before
                  the field tools, so the sender picks WHO signs first.

                  Suppressed once the scan has identified the signers, because
                  the panel below is then offering a better route — pre-labelled
                  rows with the parties already named — and highlighting the
                  manual button pulls the sender towards the slower path. Both
                  read `showingDetectedSigners` so the two can't drift out of
                  agreement; they were separate conditions before, which is how
                  the glow ended up competing with the panel. */}
              {fieldsLoaded &&
              confirmedFields.length === 0 &&
              recipients.length === 0 &&
              !showingDetectedSigners ? (
                <span className="next-step-highlight">+ Add recipient</span>
              ) : (
                "+ Add recipient"
              )}
            </button>
          )}
        </div>

        {/* "We detected N signer(s)" — guided setup, single-party documents
            included. Only from a clean slate (no recipients yet); adding
            them here creates recipients in role order so the role-tagged
            suggestions auto-bind. */}
        {showingDetectedSigners && (
          <div className="border-t border-slate-100 bg-amber-50/50 px-4 py-3 sm:px-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  This looks like it needs {detectedParties.length}{" "}
                  {detectedParties.length === 1 ? "signer" : "signers"}
                </p>
                <p className="text-xs text-slate-500">
                  Add an email for each — we&apos;ll route their fields automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetectedParties([])}
                aria-label="Dismiss detected signers"
                className="shrink-0 text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="mt-2.5 flex flex-col gap-2">
              {signerInputs.map((s, i) => {
                const color = RECIPIENT_COLORS[i % RECIPIENT_COLORS.length];
                // Title and company are context, not inputs — they tell the
                // sender which "Consultant" this is without adding fields to
                // fill. Shown whenever the document stated them, including the
                // common case where the entity is named but its signatory
                // isn't, which is exactly when the sender needs the hint most.
                const context = [s.title, s.company].filter(Boolean).join(", ");
                return (
                  <div key={s.role}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                          color.border,
                          color.bg,
                          color.text
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", color.dot)} />
                        {s.label}
                      </span>
                      <Input
                        value={s.name}
                        onChange={(e) => updateSignerInput(s.role, "name", e.target.value)}
                        placeholder="Name (optional)"
                        className="h-7 w-28 min-w-0 flex-1 text-xs sm:w-32 sm:flex-none"
                      />
                      <Input
                        value={s.email}
                        onChange={(e) => updateSignerInput(s.role, "email", e.target.value)}
                        type="email"
                        placeholder="email@example.com"
                        className={cn(
                          "h-7 w-40 min-w-0 flex-1 text-xs sm:w-44 sm:flex-none",
                          // Distinct color from the (grey) name-provenance
                          // note below — matching against a saved contact is
                          // a stronger claim than "read from the document"
                          // (see the email comment above runSuggestFields),
                          // so it gets a visibly different treatment, not
                          // the same muted styling.
                          s.matchedFrequentSignerId && "border-violet-400 bg-violet-50 focus-visible:ring-violet-600"
                        )}
                      />
                    </div>
                    {context && <p className="mt-0.5 pl-1 text-[11px] text-slate-400">{context}</p>}
                    {s.matchedFrequentSignerId && (
                      <p className="mt-0.5 pl-1 text-[11px] text-violet-600">
                        Matched to a saved contact — check before sending
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Says where the names came from. Pre-filled data that looks
                user-entered stops being checked, and these are read from the
                document rather than chosen by the sender — so the provenance
                has to be visible, or the one thing this feature could get
                wrong sails through unnoticed. Only shown when something was
                actually pre-filled. Matched emails get their own per-row
                note just above (violet, not grey) rather than folding into
                this line — email is the higher-stakes field. */}
            {signerInputs.some((s) => s.name.trim()) && (
              <p className="mt-2 text-[11px] text-slate-400">
                Names read from the document — check them before sending
              </p>
            )}
            <div className="mt-2.5">
              {(() => {
                const filled = signerInputs.filter((s) => s.email.trim()).length;
                return (
                  <Button size="sm" onClick={addDetectedSigners} disabled={filled === 0}>
                    {filled > 0 ? `Add ${filled} ${filled === 1 ? "signer" : "signers"}` : "Add signers"}
                  </Button>
                );
              })()}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5 sm:px-6">
          <span className="text-xs font-medium text-slate-500">Payment link:</span>
          {!hasPaymentCollection ? (
            <a href="/pricing" className="text-xs text-slate-400 hover:text-slate-600">
              Request payment on signing (Business)
            </a>
          ) : showPaymentEditor ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Input
                value={paymentLabel}
                onChange={(e) => setPaymentLabel(e.target.value)}
                placeholder="Label, e.g. $500 deposit"
                className="h-7 w-40 text-xs"
              />
              <Input
                value={paymentLinkUrl}
                onChange={(e) => setPaymentLinkUrl(e.target.value)}
                placeholder="https://buy.stripe.com/..."
                className="h-7 w-56 text-xs"
              />
              <button
                onClick={savePayment}
                disabled={savingPayment}
                className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                {savingPayment ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setShowPaymentEditor(false)} className="text-xs text-slate-400 hover:text-slate-600">
                Cancel
              </button>
              {paymentError && <span className="text-xs text-red-600">{paymentError}</span>}
            </div>
          ) : paymentLinkUrl ? (
            <button
              onClick={() => setShowPaymentEditor(true)}
              className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              {paymentLabel || "Payment link set"}
            </button>
          ) : (
            <button
              onClick={() => setShowPaymentEditor(true)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
            >
              + Add payment link
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5 sm:px-6">
          <span className="text-xs font-medium text-slate-500">Document gate:</span>
          {!hasDocGate ? (
            <a href="/pricing" className="text-xs text-slate-400 hover:text-slate-600">
              Gate a linked asset behind signing (Business)
            </a>
          ) : showDocgateEditor ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  value={docgateLabel}
                  onChange={(e) => setDocgateLabel(e.target.value)}
                  placeholder="Label, e.g. Access your welcome kit"
                  className="h-7 w-52 text-xs"
                />
                <Input
                  value={docgateUrl}
                  onChange={(e) => setDocgateUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="h-7 w-56 text-xs"
                />
                <button
                  onClick={saveDocgate}
                  disabled={savingDocgate}
                  className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {savingDocgate ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setShowDocgateEditor(false)} className="text-xs text-slate-400 hover:text-slate-600">
                  Cancel
                </button>
                {docgateError && <span className="text-xs text-red-600">{docgateError}</span>}
              </div>
              <p className="text-xs text-slate-400">
                Released to every signer once everyone has signed. SignedBy doesn&apos;t manage sharing permissions on
                the linked file — double-check it&apos;s shared correctly before sending.
              </p>
            </div>
          ) : docgateUrl ? (
            <button
              onClick={() => setShowDocgateEditor(true)}
              className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              {docgateLabel || "Gate link set"}
            </button>
          ) : (
            <button
              onClick={() => setShowDocgateEditor(true)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
            >
              + Add gate link
            </button>
          )}
        </div>
      </div>

      {/* First-run walkthrough — one step at a time, advancing by itself as
          the sender acts. See WALKTHROUGH_SEEN_KEY for why this replaced the
          all-three-steps-at-once banner that used to live here. */}
      {showWalkthrough && walkthroughStep !== null && (
        <div className="flex items-start justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3 sm:px-6">
          <div className="flex items-start gap-3">
            <span
              className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white"
              aria-hidden="true"
            >
              {walkthroughStep}
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-950">
                {walkthroughStep === 1 && "Add who needs to sign"}
                {walkthroughStep === 2 && "Pick a field type"}
                {walkthroughStep === 3 && "Now click the document"}
              </p>
              <p className="mt-0.5 text-xs text-blue-900">
                {walkthroughStep === 1 &&
                  "Use “+ Add recipient” below — the highlighted button. You can add more than one."}
                {walkthroughStep === 2 && (
                  <>
                    Choose <strong>Signature</strong> (or Date, Initials…) from the tools above — or press{" "}
                    {/* Explicit {" "} — a production screenshot once rendered
                        this as "Suggest fieldsto scan", so don't rely on the
                        literal space after the closing tag surviving the
                        build. */}
                    <strong>Suggest fields</strong>
                    {" to place them automatically."}
                  </>
                )}
                {walkthroughStep === 3 &&
                  "Click anywhere on the outlined page to drop the field where you want it. Then send."}
              </p>
            </div>
          </div>
          <button
            onClick={dismissWalkthrough}
            className="whitespace-nowrap text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            Skip
          </button>
        </div>
      )}

      {/* The armed-to-place instruction. Made louder 2026-08-16 (first
          external tester, item #2: didn't notice they were meant to click the
          document). It was a thin text-xs strip that read as a static caption
          rather than a live instruction telling you to do something right
          now. Kept slate-900 deliberately — that's the same colour the
          selected field-tool chip uses, so the bar reads as "this tool is
          armed" rather than as an unrelated banner; only its weight, size and
          the pulsing dot changed.

          Note this bar can only ever help someone who has already selected a
          field tool — it doesn't render otherwise. A sender who never picks a
          tool never sees it, which is the deeper half of item #2 and is NOT
          addressed here (the `next-step-highlight` glow on the signature tool
          is the existing answer to that). */}
      {selectedTool && (
        <p className="flex items-center justify-center gap-2 bg-slate-900 px-6 py-2.5 text-center text-sm font-medium text-white">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-white" aria-hidden="true" />
          <span>
            Click anywhere on the document to place a {fieldDef(selectedTool).label.toLowerCase()} field
            {activeRecipientId ? " for the selected recipient." : " (unassigned — select a recipient chip above to assign it)."}
          </span>
        </p>
      )}

      {suggesting && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2.5 sm:px-6">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-xs text-amber-900">
            Looking for signature, date, and initials spots in this document…
            {/* Console-only hint (2026-08-02, direct ask) — the moment
                someone coming from a Console upload is most likely to
                assume nothing happened and hit Suggest again, producing a
                duplicate batch (see suggestGenerationRef's comment above
                for the underlying race this used to cause — now harmless
                either way, but better to just avoid the extra click). */}
            {cameFromConsole && " Usually takes a few seconds — no need to click Suggest again."}
          </p>
        </div>
      )}

      {!suggesting && suggestError && (
        <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-2.5 sm:px-6">
          <p className="text-xs text-red-700">{suggestError}</p>
          <button
            onClick={() => runSuggestFields()}
            className="whitespace-nowrap text-xs font-medium text-red-700 hover:text-red-900"
          >
            Try again
          </button>
        </div>
      )}

      {!suggesting && fields.some((f) => f.suggested && f.placeholder) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-2.5 sm:px-6">
          <p className="text-xs text-amber-900">
            This document doesn&apos;t appear to have readable text (it may be a scanned image), so we couldn&apos;t
            detect field positions automatically. We&apos;ve placed one starting field — move it, or add your own.
          </p>
          <button
            onClick={() => setFields((prev) => prev.filter((f) => !f.suggested))}
            className="whitespace-nowrap text-xs font-medium text-amber-800 hover:text-amber-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {!suggesting && fields.some((f) => f.suggested && !f.placeholder) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-2.5 sm:px-6">
          <p className="text-xs text-amber-900">
            {fields.filter((f) => f.suggested && !f.placeholder).length} suggested field
            {fields.filter((f) => f.suggested && !f.placeholder).length === 1 ? "" : "s"} — dashed outline. Click or
            drag one to confirm it, or use its × to remove it. Fields are filled in by your signer after you send —
            there&apos;s nothing to type into them here.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => runSuggestFields(true)}
              className="whitespace-nowrap text-xs font-medium text-amber-800 hover:text-amber-950"
            >
              Re-suggest
            </button>
            <button
              onClick={() => setFields((prev) => prev.filter((f) => !f.suggested))}
              className="whitespace-nowrap text-xs font-medium text-amber-800 hover:text-amber-950"
            >
              Clear suggestions
            </button>
          </div>
        </div>
      )}

      {/* px-3/pb-28 on mobile: near-full-width pages (every horizontal pixel
          matters when placing fields on a phone) and clearance for the fixed
          bottom action bar. */}
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-3 pb-28 pt-6 sm:gap-6 sm:px-6 sm:py-10">
        {loading && <p className="text-sm text-slate-500">Loading document…</p>}

        {/* pageRefs is a DOM-node map written from the callback ref below and
            read only in callbacks/effects (scrollToDocPosition, drag handlers)
            — never during render. react-hooks/refs' escape analysis flags the
            whole map as a render-time ref access anyway; it's a false positive
            here. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {pageCanvases.map(({ page, dataUrl, width, height }) => (
          <div
            key={page}
            ref={(el) => {
              pageRefs.current[page] = el;
            }}
            data-page-canvas
            onClick={(e) => handlePageClick(e, page)}
            className={cn(
              "relative w-full border border-slate-300 bg-white shadow-sm",
              // Ring the page itself while a field tool is armed (2026-08-16,
              // tester item #2). The crosshair cursor below already signals
              // this, but only once the pointer is over the page and not at
              // all on touch — where 92% of traffic is. Ringing the target
              // makes "the document is what you click" visible before the
              // sender moves or taps anything.
              selectedTool && "ring-2 ring-slate-900"
            )}
            // Sized by aspect-ratio (not a fixed height alongside maxWidth:
            // 100%) so the page scales down correctly on any viewport
            // narrower than its native rendered width — e.g. a phone screen
            // — instead of the width shrinking to fit while the height stays
            // pinned at its full-size pixel value, which visibly squished/
            // stretched the page (and every field box on it) on narrow
            // screens. maxWidth caps it at the PDF's native rendered size so
            // it never upscales past that and looks blurry on a wide screen.
            style={{
              aspectRatio: `${width} / ${height}`,
              maxWidth: `${width}px`,
              cursor: selectedTool ? "crosshair" : "default",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt={`Page ${page}`} className="pointer-events-none block h-full w-full select-none" />

            {fields
              .filter((f) => f.page === page)
              .map((f) => {
                const def = fieldDef(f.type);
                const color = recipientColor(recipients, f.signerId);
                const recipient = recipients.find((r) => r.id === f.signerId);
                const recipientName = recipient ? recipient.name.trim() || recipient.email : null;
                return (
                  <div
                    key={f.id}
                    onPointerDown={(e) => handleFieldPointerDown(e, f)}
                    // Swallow the click so it never bubbles to the page's
                    // place-a-field handler — clicking an already-placed field
                    // (e.g. to reposition it) used to drop a duplicate on top
                    // when a field tool was still armed.
                    onClick={(e) => e.stopPropagation()}
                    // Not an input — senders repeatedly try to type into
                    // these (customer report 2026-07-14). The value comes
                    // from the signer after sending.
                    title={`${recipientName ? `${recipientName} — ` : ""}${fieldDef(f.type).label} — your signer fills this in after you send`}
                    className={cn(
                      "group absolute flex touch-none cursor-move items-center justify-center rounded border-2 text-[10px] font-medium",
                      f.suggested
                        ? "border-dashed border-amber-500 bg-amber-50/80 text-amber-800"
                        : cn(color.border, color.bg, color.text)
                    )}
                    style={{
                      left: `${f.x * 100}%`,
                      top: `${f.y * 100}%`,
                      width: `${f.width * 100}%`,
                      height: `${f.height * 100}%`,
                    }}
                  >
                    {f.suggested && (
                      <span className="absolute -top-4 left-0 whitespace-nowrap rounded bg-amber-500 px-1 py-0.5 text-[9px] font-semibold text-white">
                        {f.placeholder ? "Placeholder" : "Suggested"}
                      </span>
                    )}
                    {/* Show WHO the field is for, not just its color — a
                        sender who accidentally places a field in the wrong
                        party's block sees the counterparty's name sitting in
                        it (customer report 2026-07-15). Name on top, field type
                        below; falls back to the party/unassigned label when no
                        real recipient is bound yet. */}
                    <span className="pointer-events-none flex max-w-full flex-col items-center px-0.5 leading-tight">
                      {recipientName ? (
                        <span className="max-w-full truncate font-semibold">{recipientName}</span>
                      ) : f.templateRole !== null ? (
                        <span className="truncate">Party {f.templateRole + 1}</span>
                      ) : (
                        <span className="truncate italic opacity-80">Unassigned</span>
                      )}
                      <span className="text-[9px] font-normal opacity-80">{def.label}</span>
                    </span>
                    {/* Corner resize handles (confirmed fields only; appear on
                        hover). Three corners — top-right is left for the delete
                        ×. Match DocuSign/SignNow's drag-to-resize. */}
                    {!f.suggested &&
                      [
                        { left: true, top: true, cls: "-left-1 -top-1 cursor-nwse-resize" },
                        { left: true, top: false, cls: "-left-1 -bottom-1 cursor-nesw-resize" },
                        { left: false, top: false, cls: "-right-1 -bottom-1 cursor-nwse-resize" },
                      ].map((c) => (
                        <span
                          key={`${c.left}-${c.top}`}
                          onPointerDown={(e) => handleResizePointerDown(e, f, { left: c.left, top: c.top })}
                          onClick={(e) => e.stopPropagation()}
                          aria-hidden
                          className={cn(
                            "absolute z-10 h-2.5 w-2.5 touch-none rounded-sm border border-white opacity-0 shadow-sm group-hover:opacity-100",
                            color.dot,
                            c.cls
                          )}
                        />
                      ))}
                    {f.suggested && (
                      <button
                        // Stops the pointerdown here too, not just the click below —
                        // otherwise it bubbles up to the field div's own
                        // onPointerDown first (see handleFieldPointerDown) and starts
                        // a drag/confirm cycle of its own at the same time as this
                        // button's click, racing against it. That race was the cause
                        // of confirming sometimes shifting the field to an unexpected
                        // spot, and removing sometimes silently only confirming
                        // instead of deleting.
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmField(f.id);
                        }}
                        aria-label={`Confirm ${def.label.toLowerCase()} field`}
                        // Larger than the plain h-5 w-5 icon size on touch-sized
                        // viewports (still 20px on sm+/mouse) — a 20px target
                        // next to another 20px target a few pixels away is a
                        // rough tap on a phone, especially with two fields
                        // placed close together.
                        className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow-sm sm:-left-2.5 sm:-top-2.5 sm:h-5 sm:w-5"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(f.id);
                      }}
                      aria-label={`Remove ${def.label.toLowerCase()} field`}
                      className={cn(
                        "absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-sm transition-opacity sm:-right-2.5 sm:-top-2.5 sm:h-5 sm:w-5",
                        // Mouse/trackpad: reveal on hover (or keyboard focus),
                        // matching the resize handles above — a document with
                        // several placed fields was otherwise permanently
                        // covered in red badges, which reads as errors rather
                        // than controls. Gated on pointer-fine so TOUCH users
                        // still always see it: they have no hover, and without
                        // it there'd be no way to delete a field on a phone.
                        "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100"
                      )}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
          </div>
        ))}

        {!loading && pageCanvases.length === 0 && (
          <p className="text-sm text-red-600">Couldn&apos;t load this document ({pageCount} expected pages).</p>
        )}
      </div>

      {/* Mobile-only fixed bottom bar — Save/Send belong under the thumb,
          not buried in a sticky header that's already fighting for space.
          Matches the signer side's fixed swipe-to-submit bar (same shadow,
          same safe-area padding) so the two halves of the product feel like
          one app. Status/validation messages surface here too, next to the
          button that triggered them. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] sm:hidden">
        {statusMessage && <p className="mb-2 text-center text-xs text-slate-600">{statusMessage}</p>}
        {/* One full-width action. Save draft used to sit alongside and take a
            third of the thumb zone; it's in the More menu now, and the
            autosave pill in the header strip already says the draft is safe —
            so the only committing action gets the whole width. Yellow with a
            forward arrow, matching the homepage CTA and the signer side's
            swipe-to-sign bar, so both ends of the flow finish the same way. */}
        <Button
          variant="cta"
          className="w-full"
          onClick={() => handleSend()}
          disabled={saving || sending}
        >
          {sending ? "Sending…" : "Send for signature →"}
        </Button>
      </div>

      {showSendReview && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">Before you send — who signs where</p>
            <p className="mt-1 text-xs text-slate-500">
              Every recipient needs at least one field to sign. The recipients marked below have none — assign them a
              field or remove them, then send.
            </p>
            <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
              {recipients.map((r, i) => {
                const count = confirmedFields.filter((f) => effectiveOwner(f) === r.id).length;
                const color = RECIPIENT_COLORS[i % RECIPIENT_COLORS.length];
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", color.dot)} />
                      <span className="truncate text-slate-700">{r.name?.trim() || r.email}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 whitespace-nowrap text-xs font-medium",
                        count === 0 ? "text-red-600" : "text-slate-500"
                      )}
                    >
                      {count} field{count === 1 ? "" : "s"}
                      {count === 0 ? " — nothing to sign" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setShowSendReview(false)}>Go back and fix</Button>
            </div>
          </div>
        </div>
      )}

      {domainWarnings && domainWarnings.length > 0 && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">One of these addresses might have a typo</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {domainWarnings.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Nothing has been sent yet. Double-check the address, or send anyway if it&apos;s correct.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDomainWarnings(null)}>
                Go back and check
              </Button>
              <Button
                onClick={() => {
                  setDomainWarnings(null);
                  handleSend(true);
                }}
              >
                Send anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Free plan's 3-sends/month cap-hit (2026-08-05) — same copy/options
          as new-document-client.tsx's blue upsell card (Upgrade to Pro
          leads, credit-pack top-up second, small "view pricing plans"
          escape hatch), just as a modal here rather than an inline card,
          matching this file's existing showSendReview/domainWarnings
          pattern. Set either by sendCapReached's early-bail in handleSend
          (before any request goes out) or by the real /send call's own
          402 with `upgrade: true`. */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start gap-2.5">
              <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-medium text-slate-900">You&apos;ve used your 3 free docs this month</p>
                <p className="mt-0.5 text-xs text-slate-500">Upgrade to Pro to send unlimited documents.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={upgradeLoading}
                onClick={upgradeToPro}
                className="flex-1 border-0 bg-violet-600 text-white hover:bg-violet-700"
              >
                {upgradeLoading ? "Starting checkout…" : "Upgrade to Pro"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={creditsLoading}
                onClick={buyCreditPack}
                className="flex-1"
              >
                {creditsLoading ? "Starting checkout…" : `25 more for ${formatCreditPackPrice(currency)}`}
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Link href="/pricing" className="text-xs text-blue-700 underline hover:text-blue-900">
                view pricing plans
              </Link>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">Save as template</p>
            <p className="mt-1 text-xs text-slate-500">
              Field positions and recipient roles are saved (e.g. &quot;Signer 1&quot;, &quot;Signer 2&quot;) — the
              actual recipients you pick each time you use this template.
            </p>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="mt-3"
              onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
            />
            {/* Console-only hint (2026-08-02, direct ask) — a multi-party
                console upload never gets an inline name proposal in chat
                (see console-chat.tsx's handleTemplateFileSelected, the
                parties.length >= 2 branch), so nothing else on screen
                explains that this field is already prefilled to agree with
                what Console itself would call this document. */}
            {cameFromConsole && (
              <p className="mt-1.5 text-xs text-slate-400">
                Prefilled to match what Console expects — keep it, or note your new name so you can ask Console to
                find it later.
              </p>
            )}
            {templateError && <p className="mt-2 text-sm text-red-600">{templateError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                disabled={savingTemplate}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <Button onClick={handleSaveAsTemplate} disabled={savingTemplate || !templateName.trim()}>
                {savingTemplate ? "Saving…" : "Save template"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Subject/message: sender-editable, no default preview shown here —
          the real default is computed server-side from the org name (which
          this component doesn't have), so the input is blank-by-default
          with a placeholder rather than duplicating that logic client-side
          and risking the two drifting apart. Notice: as between you and
          SignedBy, you're the controller of your recipients' data (Terms of
          Service Section 4) — this is where you set the notice that helps
          you meet that disclosure duty. Nothing here is gated to any plan;
          not a hard gate on Send either, matching the product's general
          no-added-friction stance on the send path — senders who never
          open this menu item still get sensible defaults for all three
          fields. */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">Customize invite email</p>
            <p className="mt-1 text-xs text-slate-500">
              Sent to every recipient when you send this document. Leave anything blank to use the default.
            </p>

            <label className="mt-3 block text-xs font-medium text-slate-700">Subject line</label>
            <Input
              value={inviteSubject}
              onChange={(e) => setInviteSubject(e.target.value)}
              placeholder={`e.g. Please review and sign "${documentTitle}"`}
              maxLength={200}
              className="mt-1"
            />

            <label className="mt-3 block text-xs font-medium text-slate-700">
              Personal message <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Add a note for your recipients — e.g. context on the document or a deadline"
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Shown above the &quot;Review &amp; Sign&quot; button, below the standard greeting.
            </p>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={noticeEnabled}
                  onChange={(e) => setNoticeEnabled(e.target.checked)}
                />
                Include a privacy notice for recipients
              </label>
              <textarea
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                disabled={!noticeEnabled}
                rows={4}
                maxLength={2000}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                As the sender, you&apos;re the controller of your recipients&apos; data — suggested wording, not
                legal advice. A Privacy Policy link is added automatically.
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setInviteSubject("");
                  setInviteMessage("");
                  setNoticeText(defaultRecipientNotice(hasPageViewTracking));
                  setNoticeEnabled(true);
                }}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Reset to default
              </button>
              <Button onClick={() => setShowNoticeModal(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* Expiration: saved immediately via its own PUT route (not bundled
          into Send), so it can be set on a draft before it's ever sent or
          adjusted later — unlike recipient notice / subject / message above,
          which only take effect at the moment of Send. Enforced by the daily
          reminders cron (src/app/api/cron/reminders/route.ts), which flips a
          "sent" document past its expires_at to the 'expired' terminal
          status — so a saved date can take up to ~24h to actually take
          effect, which the copy below is explicit about. Ungated, same
          reasoning as the invite-customization modal above it. */}
      {showExpirationModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">Document expiration</p>
            <p className="mt-1 text-xs text-slate-500">
              After this date, the signing link stops working and any recipient who hasn&apos;t signed sees an
              &quot;expired&quot; screen. Checked once a day, so it may take up to 24 hours to take effect.
            </p>

            <label className="mt-3 block text-xs font-medium text-slate-700">Expires at</label>
            <input
              type="datetime-local"
              value={expiresAtInput}
              onChange={(e) => setExpiresAtInput(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
            <p className="mt-1 text-[11px] text-slate-400">Leave blank for no expiration.</p>

            {expirationError && <p className="mt-2 text-sm text-red-600">{expirationError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              {expiresAtInput && (
                <button
                  onClick={() => setExpiresAtInput("")}
                  disabled={savingExpiration}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowExpirationModal(false)}
                disabled={savingExpiration}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <Button onClick={saveExpiration} disabled={savingExpiration}>
                {savingExpiration ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk on/off for per-recipient authentication (see
          PER_RECIPIENT_AUTH_SCOPE.md) — a shortcut over clicking each
          chip's lock icon individually, most useful once there are more
          than a couple of recipients. Just flips client state the same way
          the individual toggle does; nothing is saved until Save draft or
          Send, same as every other recipient edit. */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">Verification</p>
            <p className="mt-1 text-xs text-slate-500">
              {recipients.filter((r) => r.auth_required).length} of {recipients.length} recipient
              {recipients.length === 1 ? "" : "s"} currently require a one-time email code before opening this
              document. You can still fine-tune individual recipients afterward from their lock icon.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => setAllAuthRequired(true)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Require verification for everyone
              </button>
              <button
                onClick={() => setAllAuthRequired(false)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Turn off for everyone
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={() => setShowVerificationModal(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* Console-return flow (2026-08-02, direct ask) — see the
          templateSaved/showBackToConsolePrompt/showSaveReminderPrompt
          state comment above for why this exists at all: neither the
          quiet "Saved as template." toast nor the small "← Documents"
          header link gave a console-originated sender any signal that
          they were done and could leave. All three pieces below are
          gated on cameFromConsole; every other path into this page
          (a plain upload, AI Drafter, duplicate, template) never
          renders any of them. */}
      {cameFromConsole && (
        <button
          type="button"
          onClick={() => {
            if (templateSaved) {
              discardPreviewDraftIfAny();
              window.location.href = backToConsoleUrl;
            } else {
              // Don't navigate silently — leaving before saving means the
              // fields placed here never become a reusable template, the
              // entire point of this detour from Console.
              setShowSaveReminderPrompt(true);
            }
          }}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-black/25 hover:bg-slate-800"
        >
          ← Back to Console
        </button>
      )}

      {showSaveReminderPrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">Save this as a template first?</p>
            <p className="mt-1 text-xs text-slate-500">
              You haven&apos;t saved a template yet — leave now and the fields you&apos;ve placed here won&apos;t be
              reusable from Console.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                onClick={() => {
                  setShowSaveReminderPrompt(false);
                  setShowSaveTemplateModal(true);
                }}
              >
                Save as template
              </Button>
              <button
                onClick={() => {
                  setShowSaveReminderPrompt(false);
                  discardPreviewDraftIfAny();
                  window.location.href = backToConsoleUrl;
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Go to Console anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackToConsolePrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
            <p className="text-sm font-semibold text-slate-900">
              &quot;{lastSavedTemplateName}&quot; saved as a template ✓
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              The upload itself is still sitting in Documents as a draft — safe to ignore or delete, since the
              reusable template now lives on its own.
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                discardPreviewDraftIfAny();
                window.location.href = backToConsoleUrl;
              }}
            >
              Back to Console →
            </Button>
            <button
              onClick={() => setShowBackToConsolePrompt(false)}
              className="mt-2.5 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Stay and keep editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
