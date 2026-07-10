"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function UseTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  async function handleUse() {
    setLoading(true);
    setError("");
    setShowUpgrade(false);
    try {
      const res = await fetch(`/api/templates/${templateId}/use`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't create a document from this template.");
        setShowUpgrade(Boolean(data.upgrade));
        setLoading(false);
        return;
      }
      router.push(`/dashboard/documents/${data.id}`);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleUse} disabled={loading}>
        {loading ? "Creating…" : "Use template"}
      </Button>
      {error && (
        <p className="max-w-[220px] text-right text-xs text-red-600">
          {error}
          {showUpgrade && (
            <>
              {" "}
              <Link href="/pricing" className="font-medium underline">
                View plans
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
