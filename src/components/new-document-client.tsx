"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { UploadCloud, Upload, Sparkles, Receipt, Rocket, ShieldCheck, Signature, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AiDraftForm } from "@/components/ai-draft-form";
import { MagicQuoteForm } from "@/components/magic-quote-form";
import type { QuoteCurrencySymbol } from "@/lib/quote-types";
import type { DraftDocumentType } from "@/lib/ai-draft-types";
import { formatCreditPackPrice, type Currency } from "@/lib/currency";
import { getStripeClient } from "@/lib/stripe-client";
import { useSendSealTransition } from "@/components/send-seal-transition";

// Shared by every tab state (upload, Verified Badge, Magic Quote, AI
// Drafter, and AI Drafter's locked upsell) so they stay the same size as
// labels change. No min-w here on purpose — the parent is a grid (see the
// JSX below), so each tab's width comes from its grid column, which always
// divides the available space evenly instead of a fixed min-w flex row,
// which could add up wider than a narrow phone screen and push a later tab
// past the card's edge. text-center keeps a short label centered in its
// column; text-xs/px-2 (vs. sm:text-sm/px-3) give the longest label ("AI
// Drafter · Pro+") more room to fit without wrapping on the narrowest
// columns.
const MODE_TAB_CLASS =
  "w-full rounded-md border px-2 py-1.5 text-center text-xs font-medium transition-colors sm:px-3 sm:text-sm";

// First-visit explainer for the three-tab menu below (2026-08-05, direct
// ask: "so it's clear what they are looking at") — same
// localStorage-gate-once + deferred-tick pattern as this app's other
// one-time hints (new-document-button.tsx's HINT_SEEN_KEY,
// console-plan-status.tsx's PRODUCT_INTRO_KEY, field-editor.tsx's
// LOCK_HINT_SEEN_KEY). Separate key/component from new-document-button.tsx's
// own hint — that one shows on hover over the header button, before ever
// landing here, and explains that the button opens three ways to start a
// document; this one shows once actually on the page and explains what the
// tab row itself is plus the free-tier limit, so someone who lands here
// directly (a bookmark, a link, a fresh tab) still gets the explainer even
// if they never hovered the header button.
const MENU_INTRO_KEY = "sb_new_doc_menu_intro_seen";

function useMenuIntroVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(MENU_INTRO_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    // Deferred a tick — same react-hooks/set-state-in-effect workaround used
    // elsewhere in the app (new-document-button.tsx, field-editor.tsx).
    Promise.resolve().then(() => setVisible(true));
  }, []);
  return [visible, setVisible] as const;
}

export function NewDocumentClient({
  hasAiDraft,
  defaultQuoteCurrency,
  initialDocumentType,
  initialMode,
  currency = "USD",
  sendCapReached = false,
  sealCapReached = false,
}: {
  hasAiDraft: boolean;
  defaultQuoteCurrency: QuoteCurrencySymbol;
  // Set when arriving from a /templates/[slug] page via
  // ?type=nda — opens straight into the AI Drafter tab with that template
  // preselected. Harmless if the account is on Free (the existing hasAiDraft
  // gate below already falls back to the Upload tab in that case; no
  // special-casing needed here).
  initialDocumentType?: DraftDocumentType;
  // Set when arriving via ?mode=quote|draft|badge (the /magic-quote,
  // /ai-drafter, and /verified-badge marketing pages link here this way) —
  // lets a feature landing page open straight into the matching tab without
  // needing a specific document type the way ?type= does. ?type= still wins
  // when both could apply (it implies "draft" anyway), so existing
  // /templates links are unaffected. "badge" added 2026-08-05
  // (VERIFIED_BADGE_DASHBOARD_SCOPE.md) for /verified-badge's own CTA.
  initialMode?: "draft" | "quote" | "badge";
  /** Resolved visitor currency (2026-08-01, direct bug report against the
   *  matching console chat button: "Buy 25 more" here said a hardcoded
   *  "$5" regardless of where the visitor actually was — see
   *  stripe.ts's creditPackPriceFor, the checkout route this button
   *  redirects to). Same getRequestCurrency() resolution
   *  defaultQuoteCurrency above is already derived from. */
  currency?: Currency;
  /** Server-computed at page load from getFreePlanUsage (2026-08-05, direct
   *  ask: "the behaviour should still be asking to upgrade when the user
   *  tries to upload number 4"). The real enforcement now lives in
   *  checkFreePlanSendCap at the actual /send call (field-editor.tsx) —
   *  this is a read-only, non-blocking courtesy check so a Free org that's
   *  already sent 3 documents this month sees the same Upgrade card right
   *  at the "Continue" click instead of only discovering the wall after
   *  uploading and placing fields. Can go stale within a single page visit
   *  (e.g. sending in another tab), which is fine for a heads-up like this
   *  — the send route always re-checks for real regardless of what this
   *  prop said. Defaults to false so nothing changes for a plan that never
   *  passes it (Pro+ callers never pass true here in practice). */
  sendCapReached?: boolean;
  /** Same shape/staleness tradeoff as sendCapReached above, but for the
   *  independent 3-seals/month Free-plan pool (2026-08-05,
   *  VERIFIED_BADGE_DASHBOARD_SCOPE.md) — server-computed from
   *  getFreePlanUsage's sealsUsedThisMonth. Real enforcement lives in
   *  checkFreePlanSealCap inside sealDocumentAction at the actual
   *  POST /api/documents/[id]/seal call; this just skips the network
   *  round trip and shows the Upgrade card immediately on the Verified
   *  Badge tab's own "Continue" click. Defaults to false — Pro+ callers
   *  never pass true here, since sealing is unlimited on every paid plan. */
  sealCapReached?: boolean;
}) {
  const router = useRouter();
  const { trigger: triggerSendSealTransition } = useSendSealTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Separate ref/input from the dropzone's own fileInputRef (2026-08-05) —
  // opened by the main Upload/Continue button below in its pre-file
  // "Upload" state. Kept distinct rather than reusing the dropzone's input
  // so this one's onChange can tag its entry_point as "button" without the
  // dropzone's onClick handler also firing (two different elements —
  // sharing one <input> would mean whichever handler bound last "owns" its
  // onChange).
  const buttonFileInputRef = useRef<HTMLInputElement>(null);
  // Verified Badge tab's own dropzone/button file inputs (2026-08-05) —
  // entirely separate state from the Sign-a-file tab's above rather than
  // shared, since the two tabs' uploads feed different next steps (send-
  // flow field placement vs. an immediate seal call) even though the
  // upload mechanics themselves are identical (see uploadDraftDocument).
  const badgeFileInputRef = useRef<HTMLInputElement>(null);
  const badgeButtonFileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "badge" | "draft" | "quote">(
    initialDocumentType ? "draft" : initialMode ?? "upload"
  );
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [menuIntroOpen, setMenuIntroOpen] = useMenuIntroVisible();

  // Verified Badge tab state — mirrors the Sign-a-file tab's own file/
  // title/dragging/status/errorMessage/showUpgrade state above, plus one
  // addition (needsIdentity) that tab has no equivalent of.
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [badgeTitle, setBadgeTitle] = useState("");
  const [badgeIsDragging, setBadgeIsDragging] = useState(false);
  const [badgeStatus, setBadgeStatus] = useState<"idle" | "uploading" | "verifying" | "error">("idle");
  const [badgeErrorMessage, setBadgeErrorMessage] = useState("");
  const [badgeShowUpgrade, setBadgeShowUpgrade] = useState(false);
  // Set once the seal call comes back needing identity verification
  // (sealDocumentAction's needsIdentityVerification) — the already-created,
  // already-uploaded draft document id, so "Verify identity" can retry the
  // seal on that same document afterward instead of re-uploading the file.
  const [badgeNeedsIdentityDocId, setBadgeNeedsIdentityDocId] = useState<string | null>(null);

  function dismissMenuIntro() {
    setMenuIntroOpen(false);
    try {
      window.localStorage.setItem(MENU_INTRO_KEY, "1");
    } catch {
      // Best-effort — worst case it shows again next visit.
    }
  }

  const MAX_FILE_BYTES = 25 * 1024 * 1024;

  // "Upgrade to Pro" on the cap-hit card below (2026-08-05, direct ask: go
  // straight to Stripe Checkout instead of the /pricing page, "so it's
  // simple") — same POST-then-redirect shape as buyCreditPack below and as
  // pricing-cards.tsx's subscribe(), just hardcoded to "starter" (Pro)
  // since that's the only plan this specific upsell ever offers.
  // `source: "dashboard"` for the same cross-subdomain-cancel_url reason
  // buyCreditPack sends it explicitly below.
  async function upgradeToPro() {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "starter", source: "dashboard" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout — try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setUpgradeLoading(false);
    }
  }

  // "Buy 25 more" next to "View plans" on the cap-hit error line below —
  // same credit-pack top-up as console chat's capReached bubble
  // (CONSOLE_FREE_TIER_SCOPE.md item #8, built 2026-08-03), offered here
  // too since this is the other real surface someone hits the 3-doc cap
  // through. Same POST-then-redirect shape as that bubble's buyCreditPack.
  // `source: "dashboard"` sent explicitly (2026-08-01, alongside the
  // console-side fix for a real bug there) — this surface already lives
  // on signedby.ai, same as the route's default /dashboard/billing return
  // spot, so behavior is unchanged; explicit rather than relying on the
  // route's fallback so this doesn't silently start meaning something
  // else if that default ever changes.
  async function buyCreditPack() {
    setCreditsLoading(true);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "dashboard" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout — try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setCreditsLoading(false);
    }
  }

  // entryPoint covers three ways in: the dropzone is still both a drag-drop
  // target and a click-to-browse trigger ("dropzone" / "browse" — see the
  // onDrop/onClick handlers below), and the main button at the bottom of
  // the card is now a third, unambiguous affordance ("button") for anyone
  // who'd rather not interact with the dashed box at all (2026-08-05,
  // direct ask: "let the user choose it for the upload rather than the
  // dotted box if they prefer" — corrected same day from an earlier version
  // of this change that added a *separate* button next to the dropzone;
  // the actual ask was to repurpose the existing bottom button instead, not
  // add a new one — see its two-label state below). Same
  // "signing_upload_started" event shape/philosophy as
  // "console_upload_started" either way — this just widens which
  // entry_point values show up in it, so dropzone-vs-button preference is
  // visible in the data without any other plumbing.
  function handleFileChosen(f: File, entryPoint: "dropzone" | "browse" | "button") {
    if (f.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage("Only PDF files are supported right now.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setStatus("error");
      setErrorMessage("File is larger than 25MB.");
      return;
    }

    // Fired once a real, valid file clears both checks above — same
    // position/philosophy as console-chat.tsx's sealSelectedFile: this
    // counts upload *intent*, not final success, so a later network/upload
    // failure downstream doesn't undercount it.
    track("signing_upload_started", { entry_point: entryPoint });

    setStatus("idle");
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
  }

  // Verified Badge tab's own file-chosen validation (2026-08-05) — same
  // rules as handleFileChosen above (PDF only, 25MB cap), separate function
  // only because it writes to the badge* state instead.
  //
  // "seal_upload_started" (2026-08-05, direct ask) — was lumped into the
  // generic "signing_upload_started" event with entry_point: "verified_
  // badge", which buried dashboard sealing volume inside the Sign tab's own
  // metric. Own event name now, same entry_point vocabulary ("dropzone" /
  // "browse" / "button") as handleFileChosen's own event above, so
  // dashboard-vs-Console upload volume is a clean side-by-side against
  // console-chat.tsx's "console_upload_started" rather than something to
  // untangle out of a shared bucket.
  function handleBadgeFileChosen(f: File, entryPoint: "dropzone" | "browse" | "button") {
    if (f.type !== "application/pdf") {
      setBadgeStatus("error");
      setBadgeErrorMessage("Only PDF files are supported right now.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setBadgeStatus("error");
      setBadgeErrorMessage("File is larger than 25MB.");
      return;
    }
    track("seal_upload_started", { entry_point: entryPoint });
    setBadgeStatus("idle");
    setBadgeFile(f);
    if (!badgeTitle) setBadgeTitle(f.name.replace(/\.pdf$/i, ""));
  }

  // Direct-to-R2 upload in three steps so the file never passes through a
  // Vercel serverless function (whose request body is capped at 4.5 MB):
  //   1. ask our API for a presigned PUT URL
  //   2. PUT the file straight to R2
  //   3. finalize — our API validates the PDF and creates the record
  // Shared by both the Sign-a-file tab (handleUpload below) and the
  // Verified Badge tab (handleSealUpload below) — extracted 2026-08-05 when
  // the second caller showed up, same "extract once a real second use case
  // exists" precedent as elsewhere in this codebase. What each caller does
  // with the resulting document id differs (redirect straight into the
  // field editor vs. immediately call POST /api/documents/[id]/seal), which
  // is why this returns a plain result rather than doing the redirect
  // itself. Neither upload/finalize enforce a free-plan cap themselves
  // (2026-08-05) — the real checks live at each action's own completion
  // point (send, seal); callers check their own *CapReached prop first to
  // skip the network round trip entirely when already known to be blocked.
  async function uploadDraftDocument(f: File, docTitle: string): Promise<{ ok: true; id: string } | { ok: false; error: string; upgrade: boolean }> {
    const urlRes = await fetch("/api/documents/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: f.name, size: f.size }),
    });
    const urlData = await urlRes.json();
    if (!urlRes.ok) {
      return { ok: false, error: urlData.error ?? "Upload failed.", upgrade: Boolean(urlData.upgrade) };
    }

    const putRes = await fetch(urlData.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: f,
    });
    if (!putRes.ok) {
      return { ok: false, error: "Upload failed. Please try again.", upgrade: false };
    }

    const finRes = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: urlData.documentId,
        key: urlData.key,
        title: docTitle,
        filename: f.name,
      }),
    });
    const finData = await finRes.json();
    if (!finRes.ok) {
      return { ok: false, error: finData.error ?? "Upload failed.", upgrade: Boolean(finData.upgrade) };
    }
    return { ok: true, id: finData.id };
  }

  // Upload/finalize no longer enforce the free-plan cap themselves
  // (2026-08-05 — see sendCapReached's doc comment above); the real check
  // now happens at send. What follows is that: if the org's already used
  // its 3 sends this month, skip the network round trip entirely and show
  // the same Upgrade card immediately, right on this click.
  async function handleUpload() {
    if (!file) return;

    // Fired on the click itself, same "counts intent, not final success"
    // philosophy as signing_upload_started above — a network failure
    // downstream still means someone tried to continue. button_color
    // dropped from this event's payload (2026-08-05) now that the
    // black-vs-yellow test it measured is over — see flags.ts's retired
    // uploadContinueButtonColorFlag note.
    track("signing_continue_clicked");

    if (sendCapReached) {
      setStatus("error");
      setShowUpgrade(true);
      return;
    }

    setStatus("uploading");
    setErrorMessage("");
    setShowUpgrade(false);

    try {
      const result = await uploadDraftDocument(file, title);
      if (!result.ok) {
        setStatus("error");
        setErrorMessage(result.error);
        setShowUpgrade(result.upgrade);
        return;
      }
      router.push(`/dashboard/documents/${result.id}`);
    } catch {
      setStatus("error");
      setErrorMessage("Upload failed. Check your connection and try again.");
    }
  }

  // Verified Badge tab's equivalent of handleUpload — uploads via the same
  // shared helper, then immediately calls the seal route rather than
  // redirecting into the field editor (a Verified Badge document has no
  // fields to place; sealing IS the send). Three outcomes past a plain
  // error: sealCapReached (Free's independent 3-seals/month pool, checked
  // client-side first same as sendCapReached), the seal route's own upgrade
  // response (defensive — same reasoning as handleUpload's), and
  // needsIdentityVerification, which has no equivalent in the send flow at
  // all — see handleVerifyIdentity below for how that one resolves.
  async function handleSealUpload() {
    if (!badgeFile) return;

    if (sealCapReached) {
      setBadgeStatus("error");
      setBadgeShowUpgrade(true);
      return;
    }

    setBadgeStatus("uploading");
    setBadgeErrorMessage("");
    setBadgeShowUpgrade(false);
    setBadgeNeedsIdentityDocId(null);

    try {
      const uploadResult = await uploadDraftDocument(badgeFile, badgeTitle);
      if (!uploadResult.ok) {
        setBadgeStatus("error");
        setBadgeErrorMessage(uploadResult.error);
        setBadgeShowUpgrade(uploadResult.upgrade);
        return;
      }
      await sealUploadedDocument(uploadResult.id);
    } catch {
      setBadgeStatus("error");
      setBadgeErrorMessage("Upload failed. Check your connection and try again.");
    }
  }

  // Split out from handleSealUpload (2026-08-05) so handleVerifyIdentity
  // below can call this same seal step again on the already-uploaded
  // document, once identity verification actually completes, without
  // re-running the upload.
  async function sealUploadedDocument(documentId: string) {
    try {
      const sealRes = await fetch(`/api/documents/${documentId}/seal`, { method: "POST" });
      const sealData = await sealRes.json();
      if (!sealRes.ok) {
        setBadgeStatus("error");
        if (sealData.needsIdentityVerification) {
          setBadgeNeedsIdentityDocId(documentId);
          setBadgeErrorMessage(sealData.error ?? "Verify your identity before sealing your first document.");
        } else {
          setBadgeErrorMessage(sealData.error ?? "Couldn't seal that file.");
          setBadgeShowUpgrade(Boolean(sealData.upgrade));
        }
        return;
      }
      // Popover-then-navigate (2026-08-05) instead of a bare router.push —
      // see send-seal-transition.tsx.
      triggerSendSealTransition("sealed", `/dashboard/documents/${documentId}`);
    } catch {
      setBadgeStatus("error");
      setBadgeErrorMessage("Something went wrong. Check your connection and try again.");
    }
  }

  // Stripe Identity's hosted verification modal (org-level, once-ever unless
  // stale — see identity.ts) — same underlying flow as Console's Settings
  // panel (verified-badge-settings.tsx), sharing its Stripe.js loader
  // (stripe-client.ts) rather than each loading the script separately.
  // Duplicated here rather than a single shared component, since the two
  // surfaces need different things to happen on success (this one retries a
  // specific pending seal; Settings just refreshes its own display) and a
  // shared-UI extraction wasn't worth the coupling for one button + one
  // Stripe.js call.
  async function handleVerifyIdentity() {
    if (!badgeNeedsIdentityDocId) return;
    const pendingDocId = badgeNeedsIdentityDocId;
    setBadgeStatus("verifying");
    setBadgeErrorMessage("");
    try {
      const res = await fetch("/api/org/identity/start", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't start verification.");

      const stripe = await getStripeClient();
      if (!stripe) throw new Error("Identity verification isn't configured yet — contact support.");

      const result = await stripe.verifyIdentity(data.clientSecret);
      if (result.error) throw new Error(result.error.message || "Verification didn't complete.");

      // Stripe's own review is sometimes near-instant, sometimes a few
      // minutes for manual review — the webhook
      // (src/app/api/webhooks/stripe/route.ts) is what actually sets the
      // org columns identity.ts reads. Retrying the seal immediately is
      // still the right move: the common case (instant review) already has
      // the columns set by the time this line runs, and if it's not yet set
      // this just falls back to the same needsIdentityVerification message,
      // no worse off than before.
      setBadgeNeedsIdentityDocId(null);
      await sealUploadedDocument(pendingDocId);
    } catch (err) {
      setBadgeStatus("error");
      setBadgeNeedsIdentityDocId(pendingDocId);
      setBadgeErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">New document</h1>

        {/* Every tab shares MODE_TAB_CLASS and sits in a 4-column grid, so
            they come out the same size instead of each sizing to its own
            label — a set of unequal boxes would read as a primary option
            with afterthoughts beside it, which isn't the relationship here.
            The grid (not a min-width flex row) is what keeps this from
            overflowing a narrow phone screen: four columns always split the
            card's actual width evenly, so there's nothing to overflow.
            Order (2026-08-05, VERIFIED_BADGE_DASHBOARD_SCOPE.md, direct
            instruction): Sign, Seal, Quote, then Draft in the 4th column —
            plain tab at every breakpoint (see below), confirmed against an
            actual mobile render rather than assumed. Tab labels shortened
            to single words over several direct-ask passes the same day —
            "Sign a file"/"Seal a file"/"AI Draft" became "Sign"/"Seal"/
            "Draft". */}
        <div className="relative mb-4 grid grid-cols-4 gap-2">
          <button
            onClick={() => setMode("upload")}
            className={cn(
              MODE_TAB_CLASS,
              mode === "upload"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {/* Icons on every tab (2026-07-25) so they read as distinct from
                each other without relying on color alone. Small (h-3.5) and
                shrink-0 so they hold their size if a label wraps on a narrow
                column. No tab glows anymore (2026-08-05) — see the dropzone
                below, which now carries that "press here" signal instead. */}
            <span className="inline-flex items-center justify-center gap-1.5">
              <Upload className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Sign
            </span>
          </button>
          {/* Verified Badge (2026-08-05, VERIFIED_BADGE_DASHBOARD_SCOPE.md)
              — free on every plan the same way Magic Quote is (Free's own
              independent 3-seals/month pool is enforced server-side, not by
              hiding the tab), so no locked/upsell state needed here either,
              unlike AI Drafter's 4th column. Sits second, ahead of Magic
              Quote — direct instruction. */}
          <button
            onClick={() => setMode("badge")}
            className={cn(
              MODE_TAB_CLASS,
              mode === "badge"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {/* Tab label shortened again to just "Seal" (2026-08-05, direct
                ask, was "Seal a file") — matches "Sign"'s own shortening
                the same day, keeping the compact-tab/explanatory-title
                pattern ("Get a Verified Badge" below carries the detail). */}
            <span className="inline-flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Seal
            </span>
          </button>
          <button
            onClick={() => setMode("quote")}
            className={cn(
              MODE_TAB_CLASS,
              mode === "quote"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {/* Shortened from "Magic Quote" (2026-08-05, direct ask) — same
                reasoning as the Verified Badge tab above. */}
            <span className="inline-flex items-center justify-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Quote
            </span>
          </button>

          {/* 4th column: AI Drafter, plain tab at every breakpoint
              (2026-08-05, direct correction after seeing the actual mobile
              render — "Verified Badge"/"Magic Quote" already wrap onto two
              lines in their columns at this width, so "AI Drafter" fits the
              same way; no need for a "•••" overflow trigger after all). See
              VERIFIED_BADGE_DASHBOARD_SCOPE.md's own note that this was
              worth checking against the real width rather than assuming. */}
          {hasAiDraft ? (
            <button
              onClick={() => setMode("draft")}
              className={cn(
                MODE_TAB_CLASS,
                mode === "draft"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {/* Shortened from "AI Drafter" (2026-08-05, direct ask) —
                  same reasoning as the other tabs above. */}
              <span className="inline-flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                Draft
              </span>
            </button>
          ) : (
            // Same shape/position as the real tab so the feature is still
            // discoverable, but reads as locked rather than clickable —
            // matches the "Save as template (Pro+)" pattern in
            // field-editor.tsx. Links straight to /pricing rather than
            // switching into a mode the account can't use (the API would
            // just reject it — see POST /api/documents/draft).
            <a
              href="/pricing"
              className={cn(
                MODE_TAB_CLASS,
                "border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
              )}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                Draft · Pro+
              </span>
            </a>
          )}

          {menuIntroOpen && (
            <>
              {/* Click-outside-to-dismiss overlay — same shape as
                  new-document-button.tsx's own hint popover. */}
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={dismissMenuIntro}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900">Welcome to SignedBy</p>
                  <button
                    type="button"
                    onClick={dismissMenuIntro}
                    aria-label="Dismiss"
                    className="-mr-1 -mt-1 shrink-0 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-xs font-normal leading-snug text-slate-600">
                  As an introduction to how SignedBy works, this is how you get a document signed or sealed. You can
                  send 3 documents to sign or seal per month for free.
                </p>
                <button
                  type="button"
                  onClick={dismissMenuIntro}
                  className="mt-2 text-xs font-medium text-slate-900 underline hover:text-slate-600"
                >
                  Got it
                </button>
              </div>
            </>
          )}
        </div>

        {mode === "quote" ? (
          <Card>
            <CardHeader>
              {/* "Get a Magic Quote" (2026-08-05, direct ask) — was "Magic
                  Quote", matching this file's tab-vs-title pattern (compact
                  tab, more explanatory card title) now that the tab itself
                  reads just "Quote". */}
              <CardTitle>Get a Magic Quote</CardTitle>
              <CardDescription>
                Describe the job in plain language and get a line-item price quote to review and edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MagicQuoteForm defaultCurrency={defaultQuoteCurrency} />
            </CardContent>
          </Card>
        ) : mode === "badge" ? (
          <Card>
            <CardHeader className="items-center text-center">
              {/* Centered yellow icon badge + "Generate your Verified
                  Badge" heading (2026-08-05, direct ask) — borrowed from
                  Console's own uploader (console-chat.tsx's upload-prompt
                  card), which already used this exact treatment for the
                  same action. Replaces the plain left-aligned "Get a
                  Verified Badge" title/description pairing. */}
              <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-300">
                <ShieldCheck className="h-6 w-6 text-slate-900" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <CardTitle>Generate your Verified Badge</CardTitle>
              <CardDescription>
                Seal your first file to generate cryptographic proof it&apos;s unaltered and identity-verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setBadgeIsDragging(true);
                }}
                onDragLeave={() => setBadgeIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setBadgeIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleBadgeFileChosen(dropped, "dropzone");
                }}
                onClick={() => badgeFileInputRef.current?.click()}
                className={cn(
                  // Rounded-2xl (was rounded-lg, 2026-08-05, direct ask) —
                  // matches Console's own more-rounded dropzone.
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                  badgeIsDragging ? "border-slate-900 bg-slate-100" : "border-slate-300 hover:bg-slate-50",
                  !badgeFile && "upload-glow"
                )}
              >
                <input
                  ref={badgeFileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0];
                    if (chosen) handleBadgeFileChosen(chosen, "browse");
                  }}
                />
                {badgeFile ? (
                  <p className="text-sm font-medium text-slate-900">{badgeFile.name}</p>
                ) : (
                  <>
                    {/* Plain cloud-upload icon (was ShieldCheck, 2026-08-05,
                        direct ask) — the shield now lives in the header
                        badge above, so repeating it here read as
                        redundant. */}
                    <UploadCloud className="mb-2 h-8 w-8 text-slate-400" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-900">Click to choose a PDF, or drag one here</p>
                    <p className="mt-1 text-xs text-slate-500">Up to 25MB</p>
                  </>
                )}
              </div>

              <input
                ref={badgeButtonFileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  if (chosen) handleBadgeFileChosen(chosen, "button");
                }}
              />

              {badgeFile && (
                <div className="space-y-1.5">
                  <Label htmlFor="badge-title">Document title</Label>
                  <Input id="badge-title" value={badgeTitle} onChange={(e) => setBadgeTitle(e.target.value)} />
                </div>
              )}

              {/* Identity verification gate takes precedence over the plain
                  error line and the upgrade card below — it's neither a
                  real failure nor a cap hit, just a one-time prerequisite
                  (see handleVerifyIdentity's doc comment). */}
              {badgeStatus === "error" && badgeNeedsIdentityDocId && (
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" strokeWidth={1.75} />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Verify your identity to continue</p>
                      <p className="text-xs text-blue-700">
                        One-time check before your first Verified Badge seal — reused for every seal after.
                      </p>
                    </div>
                    <Button type="button" size="sm" onClick={handleVerifyIdentity} className="w-full border-0 bg-violet-600 text-white hover:bg-violet-700">
                      Verify identity
                    </Button>
                  </div>
                </div>
              )}

              {badgeStatus === "error" && !badgeNeedsIdentityDocId && !badgeShowUpgrade && (
                <p className="text-sm text-red-600">{badgeErrorMessage}</p>
              )}

              {/* Same cap-hit treatment as the Sign-a-file tab's upgrade
                  card, adapted to Verified Badge's own independent
                  3-seals/month pool — "Upgrade to Pro" here means unlimited
                  seals, not unlimited sends (2026-08-05,
                  VERIFIED_BADGE_DASHBOARD_SCOPE.md decision 2: sealing is
                  fully unlimited on every paid plan, no $0.20/doc overage). */}
              {badgeStatus === "error" && !badgeNeedsIdentityDocId && badgeShowUpgrade && (
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" strokeWidth={1.75} />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-blue-900">You&apos;ve used your 3 free Verified Badge seals this month</p>
                      <p className="text-xs text-blue-700">Upgrade to Pro to seal unlimited documents.</p>
                    </div>
                    <div className="flex gap-2">
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
                        className="flex-1 bg-white"
                      >
                        {creditsLoading ? "Starting checkout…" : `25 more for ${formatCreditPackPrice(currency)}`}
                      </Button>
                    </div>
                    <Link href="/pricing" className="block text-center text-xs text-blue-700 underline hover:text-blue-900">
                      view pricing plans
                    </Link>
                  </div>
                </div>
              )}

              {/* Permanently yellow (2026-08-05, direct ask) — was gated on
                  the now-retired black/yellow button-color test (see
                  flags.ts). Icon + "Seal this file" borrowed from
                  Console's own permanently-yellow seal button. */}
              <Button
                className="w-full gap-1.5"
                variant="cta"
                disabled={badgeStatus === "uploading" || badgeStatus === "verifying"}
                onClick={badgeFile ? handleSealUpload : () => badgeButtonFileInputRef.current?.click()}
              >
                {badgeStatus !== "uploading" && badgeStatus !== "verifying" && (
                  <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                )}
                {badgeStatus === "uploading"
                  ? "Uploading…"
                  : badgeStatus === "verifying"
                    ? "Verifying…"
                    : badgeFile
                      ? "Seal this file"
                      : "Upload"}
              </Button>
            </CardContent>
          </Card>
        ) : mode === "draft" && hasAiDraft ? (
          <Card>
            <CardHeader>
              {/* "AI Template Drafter" (2026-08-05, direct ask) — was
                  "AI-drafted document". */}
              <CardTitle>AI Template Drafter</CardTitle>
              <CardDescription>
                Describe what you need in plain language and get a starting draft to review and edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AiDraftForm initialDocumentType={initialDocumentType} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="items-center text-center">
              {/* Centered yellow icon badge (2026-08-05, direct ask) —
                  same treatment borrowed for the Seal tab above, using a
                  signature glyph in place of the shield so the two tabs
                  read as siblings, not identical. Heading text updated to
                  match ("Get your document signed", was "Get a document
                  signed") — same 2026-08-05 pass, mocked up alongside the
                  Seal tab's own copy. Description unchanged: still names
                  the actual next step (send it out), not just the
                  field-placement step in between. */}
              <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-300">
                <Signature className="h-6 w-6 text-slate-900" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <CardTitle>Get your document signed</CardTitle>
              <CardDescription>Upload a PDF you already have, place signature fields, and send it out.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleFileChosen(dropped, "dropzone");
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  // Rounded-2xl (was rounded-lg, 2026-08-05, direct ask) —
                  // matches the Seal tab's own dropzone.
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                  isDragging ? "border-slate-900 bg-slate-100" : "border-slate-300 hover:bg-slate-50",
                  // Moved here from the Magic Quote/AI Drafter tabs
                  // (2026-08-05, direct ask) — this dropzone is the actual
                  // primary action on this page, not those two tabs, so the
                  // "press here" glow belongs on it instead. Off once a file
                  // is chosen (the zone switches to showing the filename,
                  // and the primary action moves to the Upload & continue
                  // button below — see its own black/yellow color test).
                  !file && "upload-glow"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0];
                    if (chosen) handleFileChosen(chosen, "browse");
                  }}
                />
                {file ? (
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                ) : (
                  <>
                    {/* Icon above the copy (2026-07-25) — the standard
                        Dropbox/Drive/Notion drop-zone shape, so the
                        interaction reads before anyone parses the sentence. */}
                    <UploadCloud className="mb-2 h-8 w-8 text-slate-400" strokeWidth={1.5} />
                    {/* No next-step-highlight here on purpose (2026-07-25) — a
                        dashed drop-zone with this copy already reads as an
                        upload target without help, and the sweep only made
                        this screen busier: it fired at the same time as the
                        two ai-comet tab glows above, so three things
                        animated for attention at once with nothing clearly
                        primary. Dropping it here keeps next-step-highlight's
                        "genuinely non-obvious" meaning intact for the sites
                        that still use it (sign button, add recipient,
                        docgate link) and leaves the AI tab glow as the one
                        thing this screen draws the eye to. */}
                    <p className="text-sm font-medium text-slate-900">Click to choose a PDF, or drag one here</p>
                    <p className="mt-1 text-xs text-slate-500">Up to 25MB</p>
                  </>
                )}
              </div>

              {/* Hidden input for the main button below's "Upload" state
                  (2026-08-05, direct ask, corrected same day — see the
                  handleFileChosen comment above). Kept unconditionally
                  rendered, not tied to `!file` like the dropzone's
                  placeholder copy, since the ref has to stay valid for the
                  button to open it regardless of file state; the button
                  itself only calls .click() on it pre-file (post-file it
                  runs handleUpload instead), so there's no behavior change
                  from rendering this input at all times. */}
              <input
                ref={buttonFileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  if (chosen) handleFileChosen(chosen, "button");
                }}
              />

              {file && (
                <div className="space-y-1.5">
                  <Label htmlFor="title">Document title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              )}

              {/* Cap-hit (showUpgrade) — either the sendCapReached prop short-
                  circuited handleUpload above, or (defensively) the upload/
                  finalize calls came back with `upgrade: true`. Never a real
                  failure, so it gets its own upsell card instead of sharing
                  the red error line below (2026-08-05, direct ask: the old
                  shared styling made a "buy more" moment look like something
                  had broken). Genuine errors — bad file type, oversized
                  file, a failed upload — keep the plain red line. */}
              {status === "error" && !showUpgrade && <p className="text-sm text-red-600">{errorMessage}</p>}

              {/* Blue "notice" card, not amber (2026-08-05, direct ask after
                  seeing it live: amber-400 read as an off-brand second
                  yellow sitting right above the real brand-yellow
                  "Continue" button below — design-system.md reserves
                  bg-yellow-300/variant="cta" for exactly one primary
                  action per screen, never a second competing button, even
                  in a near-miss shade). "Upgrade to Pro" uses violet-600 —
                  not a new color, the same purple already settled on for
                  the homepage CTA-color test (cta-link.tsx, #7C3AED) —
                  so it reads as "the upgrade action" without competing
                  with yellow at all. */}
              {status === "error" && showUpgrade && (
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" strokeWidth={1.75} />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-blue-900">You&apos;ve used your 3 free docs this month</p>
                      <p className="text-xs text-blue-700">Upgrade to Pro to send unlimited documents.</p>
                    </div>
                    {/* Upgrade to Pro leads (2026-08-05, direct ask) — it's the
                        better outcome (unlimited, not just +25), so it gets
                        first position and the filled/primary treatment; the
                        credit pack is the secondary, outline option. Equal
                        flex-1 widths (same direct ask) rather than
                        content-hugging, so the two options read as a
                        deliberate pair, not mismatched sizes. */}
                    <div className="flex gap-2">
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
                        className="flex-1 bg-white"
                      >
                        {creditsLoading ? "Starting checkout…" : `25 more for ${formatCreditPackPrice(currency)}`}
                      </Button>
                    </div>
                    {/* Small escape hatch for anyone who wants to compare
                        Team/Business too, not just the two options above
                        (2026-08-05, direct ask). */}
                    <Link
                      href="/pricing"
                      className="block text-center text-xs text-blue-700 underline hover:text-blue-900"
                    >
                      view pricing plans
                    </Link>
                  </div>
                </div>
              )}

              {/* Was always "Upload & continue" as one label/one click
                  (2026-08-05, direct ask, corrected same day). Two states
                  of the same button instead of a separate one next to the
                  dropzone: pre-file it reads "Upload" and just opens the
                  picker (tagged entry_point "button" — see
                  buttonFileInputRef above); once a file's chosen it now
                  reads "Sign this file" (was "Continue", 2026-08-05,
                  direct ask, same pass as the Seal tab's "Seal this file")
                  and does the actual handleUpload network chain. Never
                  disabled pre-file (it has to be clickable to open the
                  picker) — the old `!file` half of the disabled check only
                  ever made sense back when this button *was* handleUpload
                  unconditionally.

                  Permanently yellow now too (variant="cta", was gated on
                  uploadButtonColorVariant) — direct ask, borrowing
                  Console's own permanently-yellow button. This and the
                  Seal tab's matching change together retired the
                  black/yellow button-color test entirely the same day
                  (flag removed from flags.ts, prop removed here,
                  button_color dropped from signing_continue_clicked) —
                  neither button it ever applied to could show "black"
                  anymore. */}
              <Button
                className="w-full gap-1.5"
                variant="cta"
                disabled={status === "uploading"}
                onClick={file ? handleUpload : () => buttonFileInputRef.current?.click()}
              >
                {status !== "uploading" && <Signature className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
                {status === "uploading" ? "Uploading…" : file ? "Sign this file" : "Upload"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
