"use client";

import { useState } from "react";
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
  const [name, setName] = useState(initialName);
  const [brandColor, setBrandColor] = useState(initialBrandColor || "#1e3a5f");
  const [nameStatus, setNameStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [colorStatus, setColorStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [logoStatus, setLogoStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState("");

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
      router.refresh();
    } catch (err) {
      setLogoStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveName} className="space-y-2">
        <Label htmlFor="org-name">Workspace name</Label>
        <p className="text-xs text-slate-500">Shown to signers on the Team-tier branded signing page.</p>
        <div className="flex gap-2">
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <Button type="submit" variant="outline" disabled={nameStatus === "loading"}>
            {nameStatus === "loading" ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <Label>Logo</Label>
        {hasCustomBranding ? (
          <>
            <p className="text-xs text-slate-500">PNG, JPEG, WebP, or SVG — under 2MB. Shown on the signing page.</p>
            <div className="flex items-center gap-3">
              {hasLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/org/${orgId}/logo`} alt="Current logo" className="h-10 w-10 rounded object-contain" />
              )}
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={uploadLogo} className="text-sm" />
            </div>
            {logoStatus === "loading" && <p className="text-xs text-slate-500">Uploading…</p>}
            {logoStatus === "done" && <p className="text-xs text-emerald-600">Logo updated.</p>}
          </>
        ) : (
          <p className="text-xs text-slate-500">Custom logo upload is available on the Business plan.</p>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <Label htmlFor="brand-color">Brand color</Label>
        {hasCustomBranding ? (
          <>
            <p className="text-xs text-slate-500">Accents the signing page header and sign button.</p>
            <div className="flex items-center gap-2">
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
          <p className="text-xs text-slate-500">Custom brand color is available on the Business plan.</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
