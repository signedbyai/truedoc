"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function accept() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/team/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.push("/dashboard");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={accept} disabled={status === "loading"} className="w-full">
        {status === "loading" ? "Joining…" : "Accept invite"}
      </Button>
      {status === "error" && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
