"use client";

import { useEffect } from "react";

// First-touch attribution. On every page load, if the URL carries UTM params
// (e.g. a LinkedIn quiz ad landing on /quiz?utm_source=linkedin...), stash them
// — plus the referrer and landing path — in localStorage, but only if nothing
// is stored yet, so the FIRST touch wins and later navigation can't overwrite
// it. Recorded on the org after signup by AttributionClaim. This survives the
// quiz → CTA → auth-redirect hops that would strip UTMs off the URL.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function AttributionCapture() {
  useEffect(() => {
    try {
      if (window.localStorage.getItem("sb_attribution")) return; // first touch already captured
      const params = new URLSearchParams(window.location.search);
      const utm: Record<string, string> = {};
      for (const key of UTM_KEYS) {
        const v = params.get(key);
        if (v) utm[key] = v.slice(0, 200);
      }
      if (Object.keys(utm).length === 0) return; // only record real campaign touches
      utm.landing_path = window.location.pathname.slice(0, 200);
      const ref = document.referrer;
      if (ref && !ref.includes(window.location.host)) utm.referrer = ref.slice(0, 300);
      window.localStorage.setItem("sb_attribution", JSON.stringify(utm));
    } catch {
      // storage disabled — attribution just won't be captured
    }
  }, []);

  return null;
}
