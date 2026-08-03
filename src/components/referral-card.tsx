"use client";

import { useEffect, useState } from "react";
import { Gift, Sparkles, HeartHandshake, Copy, Check, X, Share2 } from "lucide-react";

// Dashboard referral. On mount it (1) claims any ?ref code stashed by
// ReferralCapture, and (2) loads this org's own referral link + conversions.
// A compact tappable card (gift + yellow sparkles) that pops open a share
// sheet — link + native share button — instead of the old inline link box.
// Dismissible; the claim runs regardless of whether it shows.
//
// Plan-conditional copy (REFERRAL_SCOPE.md, 2026-08-03): Free orgs get the
// new seal-credits pitch (lower bar — no payment needed from the referred
// friend), Pro+ keeps the original "give a month, get a month" copy
// unchanged, headline and all. Both read off the same /api/referral/me
// response — see that route for how rewardType/creditsPerReferral/
// isSuperReferrer are derived.
export function ReferralCard() {
  const [link, setLink] = useState<string | null>(null);
  const [rewardedCount, setRewardedCount] = useState(0);
  const [plan, setPlan] = useState<string>("free");
  const [creditsPerReferral, setCreditsPerReferral] = useState(5);
  const [isSuperReferrer, setIsSuperReferrer] = useState(false);
  const [sealCreditsRewardedCount, setSealCreditsRewardedCount] = useState(0);
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isFree = plan === "free";

  useEffect(() => {
    // 1. Claim a pending referral, if this user just signed up via a link.
    try {
      const pending = window.localStorage.getItem("sb_ref");
      if (pending) {
        fetch("/api/referral/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: pending }),
        })
          .catch(() => {})
          .finally(() => window.localStorage.removeItem("sb_ref"));
      }
    } catch {
      // storage disabled — nothing to claim
    }

    // 2. Load our own link + stats.
    let active = true;
    fetch("/api/referral/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.link) return;
        setLink(data.link);
        setRewardedCount(data.rewardedCount ?? 0);
        setPlan(data.plan ?? "free");
        setCreditsPerReferral(data.creditsPerReferral ?? 5);
        setIsSuperReferrer(Boolean(data.isSuperReferrer));
        setSealCreditsRewardedCount(data.sealCreditsRewardedCount ?? 0);
        try {
          setDismissed(window.localStorage.getItem("sb_ref_card_dismissed") === "1");
        } catch {
          setDismissed(false);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function copy() {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => {}
    );
  }

  async function share() {
    if (!link) return;
    const data = {
      title: "SignedBy",
      text: isFree
        ? "Get free seal credits on SignedBy — sign up with my link:"
        : "Give a month, get a month on SignedBy — sign up with my link:",
      url: link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    copy();
  }

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem("sb_ref_card_dismissed", "1");
    } catch {
      // ignore
    }
  }

  if (!link || dismissed) return null;

  return (
    <>
      {/* Compact card */}
      <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-3 pr-9">
        <button type="button" onClick={() => setOpen(true)} className="flex flex-1 items-center gap-3 text-left">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
            <Gift className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
            <Sparkles className="absolute -right-0.5 -top-0.5 h-3 w-3 text-amber-400" fill="currentColor" strokeWidth={1.5} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">
              {isFree ? "Share the seal, get credits" : "Give a month, get a month"}
            </span>
            <span className="block text-xs text-slate-600">
              {isFree
                ? sealCreditsRewardedCount > 0
                  ? `${sealCreditsRewardedCount} credit ${sealCreditsRewardedCount === 1 ? "referral" : "referrals"} earned — invite another friend`
                  : "Invite a friend and you both get seal credits"
                : rewardedCount > 0
                  ? `${rewardedCount} free ${rewardedCount === 1 ? "month" : "months"} earned — invite another friend`
                  : "Invite a friend and you both get a free month"}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Share sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-900/40"
          />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center sm:rounded-2xl sm:pb-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <HeartHandshake className="h-9 w-9 text-slate-900" strokeWidth={1.5} />
            </span>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {isFree ? "Share the seal, get credits" : "Give a month, get a month"}
            </h2>
            {isFree ? (
              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-600">
                Share your link. When someone signs up and verifies their identity to seal their first Verified
                Badge document, you get {creditsPerReferral} seal credits and they get 3 — no payment required from
                either of you.
                {sealCreditsRewardedCount > 0 && (
                  <span className="font-medium text-slate-900">
                    {" "}
                    {sealCreditsRewardedCount} referral{sealCreditsRewardedCount === 1 ? "" : "s"} earned so far.
                  </span>
                )}
                {isSuperReferrer ? (
                  <span className="mt-1 block font-medium text-slate-900">
                    You&apos;re a Super Referrer — earning double credits on every referral.
                  </span>
                ) : (
                  <span className="mt-1 block text-slate-500">
                    Refer 3 friends who verify and unlock double credits (10 per referral).
                  </span>
                )}
              </p>
            ) : (
              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-600">
                Share your link. When someone signs up and subscribes, they get their first month of Pro free — and
                so do you.
                {rewardedCount > 0 && (
                  <span className="font-medium text-slate-900">
                    {" "}
                    {rewardedCount} free {rewardedCount === 1 ? "month" : "months"} earned so far.
                  </span>
                )}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={copy}
                aria-label="Copy link"
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Points at the referral programme's own terms, not the general
                ToS. It used to link /terms, which says nothing about referrals
                — so anyone following it to check a rule about their reward
                landed on a document about liability and governing law and left
                none the wiser. */}
            <a
              href="/referral-terms"
              className="mt-3 inline-block text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Terms and conditions
            </a>

            <button
              type="button"
              onClick={share}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Share2 className="h-4 w-4" />
              Share link
            </button>
          </div>
        </div>
      )}
    </>
  );
}
