"use client";

import { useEffect } from "react";

// Runs on the dashboard after signup: sends the first-touch attribution the
// browser stashed on the ad landing (AttributionCapture) to be recorded on the
// org, then clears it. Renders nothing.
export function AttributionClaim() {
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem("sb_attribution");
    } catch {
      return;
    }
    if (!raw) return;
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem("sb_attribution");
      return;
    }
    fetch("/api/attribution/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .catch(() => {})
      .finally(() => {
        try {
          window.localStorage.removeItem("sb_attribution");
        } catch {
          // ignore
        }
      });
  }, []);

  return null;
}
