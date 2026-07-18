"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BrandingSettings({
  orgId,
  initialName,
  initialBrandColor,
  hasLogo,
  hasCustomBranding,
}: {
  orgId: string;
  initialName: string;
  initialBrandColor: string | null;
  hasLogo: boolean;
  hasCustomBranding: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [brandColor, setBrandColor] = useState(initialBrandColor || "#1e3a5f");
  const [nameStatus, setNameStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [colorStatus, setColorStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [logoStatus, setLogoStatus] = useState<"idle" | "loading" | "error" | "done" | "removed">("idle");
  const [error, setError] = useState("");
  // Tracked locally (not just via the hasLogo prop + router.refresh) so the
  // preview appears/disappears immediately after upload/remove.
  const [logoPresent, setLogoPresent] = useState(hasLogo);
  // Cache-buster for the preview <img>. The logo route serves
  // Cache-Control: public with a max-age, and the src URL never changed
  // across uploads — so after "successfully" uploading a new logo the
  // browser kept showing the old cached one (or nothing, for a first
  // upload). That made the whole feature look broken. Bumping ?v= after
  // each upload forces a fresh fetch of exactly this image.
  const [logoVersion, setLogoVersion] = useState(0);
  // The DB can point at a logo whose R2 object is missing (or R2 can be
  // misconfigured), in which case the preview <img> 404/500s and the browser
  // renders raw alt text — which looks like the whole feature is broken.
  // Catch the load failure and show an actionable line instead.
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/org/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      setNameStatus("done");
      router.refresh();
    } catch (err) {
      setNameStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function saveColor() {
    setColorStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/org/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_color: brandColor }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      setColorStatus("done");
      router.refresh();
    } catch (err) {
      setColorStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoStatus("loading");
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/org/logo", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setLogoStatus("done");
      setLogoPresent(true);
      setLogoLoadFailed(false);
      setLogoVersion(Date.now());
      router.refresh();
    } catch (err) {
      setLogoStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      e.target.value = "";
    }
  }

  async function removeLogo() {
    setLogoStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/org/logo", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't remove the logo.");
      setLogoStatus("removed");
      setLogoPresent(false);
      router.refresh();
    } catch (err) {
      setLogoStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveName} className="space-y-2">
        <Label htmlFor="org-name">Workspace name</Label>
        <p className="text-xs text-slate-500">Shown to signers on the Team-tier branded signing page.</p>
        <div className="flex gap-2">
          {/* min-w-0 flex-1 (capped at xs on wider screens) so this row
              fits a phone width instead of the fixed max-w-xs input +
              button pair overflowing it. */}
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 sm:max-w-xs sm:flex-none" />
          <Button type="submit" variant="outline" disabled={nameStatus === "loading"}>
            {nameStatus === "loading" ? "Saving…" : "Save"}
          </Button>
        </div>
        {nameStatus === "done" && <p className="text-xs text-emerald-600">Workspace name updated.</p>}
      </form>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <Label>Logo</Label>
        {hasCustomBranding ? (
          <>
            <p className="text-xs text-slate-500">PNG, JPEG, WebP, or SVG — under 2MB. Shown on the signing page.</p>
            <div className="flex flex-wrap items-center gap-3">
              {logoPresent && !logoLoadFailed && (
                // h-10 w-auto (not the old h-10 w-10 square, which squished
                // any non-square logo into an unrecognizable thumbnail) +
                // a subtle border so light-on-transparent logos are visible.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/org/${orgId}/logo${logoVersion ? `?v=${logoVersion}` : ""}`}
                  alt="Current logo"
                  onError={() => setLogoLoadFailed(true)}
                  className="h-10 w-auto max-w-[180px] rounded border border-slate-200 bg-white object-contain p-1"
                />
              )}
              {logoPresent && logoLoadFailed && (
                <span className="rounded border border-dashed border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                  Saved logo couldn&apos;t be loaded — upload it again to fix.
                </span>
              )}
              {/* Hidden native input behind a proper button — the bare
                  <input type="file"> rendered as unstyled browser chrome
                  and was the only non-button control on the page. */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={uploadLogo}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoStatus === "loading"}
              >
                {logoStatus === "loading" ? "Working…" : logoPresent ? "Replace logo" : "Upload logo"}
              </Button>
              {logoPresent && (
                <button
                  type="button"
                  onClick={removeLogo}
                  disabled={logoStatus === "loading"}
                  className="text-xs text-slate-400 underline-offset-2 hover:text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            {logoStatus === "done" && <p className="text-xs text-emerald-600">Logo updated.</p>}
            {logoStatus === "removed" && <p className="text-xs text-emerald-600">Logo removed.</p>}
          </>
        ) : (
          <p className="text-xs text-slate-500">Custom logo upload is available on the Team plan.</p>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <Label htmlFor="brand-color">Brand color</Label>
        {hasCustomBranding ? (
          <>
            <p className="text-xs text-slate-500">Accents the signing page header and sign button.</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="brand-color"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-9 w-14 rounded border border-slate-300"
              />
              <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="max-w-[120px]" />
              <Button type="button" variant="outline" onClick={saveColor} disabled={colorStatus === "loading"}>
                {colorStatus === "loading" ? "Saving…" : "Save"}
              </Button>
            </div>
            {colorStatus === "done" && <p className="text-xs text-emerald-600">Brand color updated.</p>}
          </>
        ) : (
          <p className="text-xs text-slate-500">Custom brand color is available on the Team plan.</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
