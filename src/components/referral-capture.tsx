"use client";

import { useEffect } from "react";

// Stash a ?ref=CODE from the landing URL so it survives until the visitor
// signs up (the org is created by a DB trigger that can't see the code). The
// dashboard's ReferralCard reads this on first load and records the referral.
// localStorage (not a cookie) so it works across every auth path — magic link,
// email code, and OAuth — which don't all pass through the same server route.
export function ReferralCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (code && /^[A-Za-z0-9]{4,16}$/.test(code)) {
        window.localStorage.setItem("sb_ref", code);
      }
    } catch {
      // Private-mode / storage-disabled — referral just won't be captured.
    }
  }, []);

  return null;
}
