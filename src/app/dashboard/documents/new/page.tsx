"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AiDraftForm } from "@/components/ai-draft-form";

export default function NewDocumentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "draft">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  function handleFileChosen(f: File) {
    if (f.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage("Only PDF files are supported right now.");
      return;
    }
    setStatus("idle");
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setErrorMessage("");
    setShowUpgrade(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);

    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Upload failed.");
        setShowUpgrade(Boolean(data.upgrade));
        return;
      }
      router.push(`/dashboard/documents/${data.id}`);
    } catch {
      setStatus("error");
      setErrorMessage("Upload failed. Check your connection and try again.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">New document</h1>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("upload")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "upload"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Upload a file
          </button>
          <button
            onClick={() => setMode("draft")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "draft"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Describe it (AI draft)
          </button>
        </div>

        {mode === "draft" ? (
          <Card>
            <CardHeader>
              <CardTitle>AI-drafted document</CardTitle>
              <CardDescription>
                Describe what you need in plain language and get a starting draft to review and edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AiDraftForm />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>New document</CardTitle>
              <CardDescription>Upload a PDF, then place signature fields on the next screen.</CardDescription>
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
                  if (dropped) handleFileChosen(dropped);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging ? "border-slate-900 bg-slate-100" : "border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0];
                    if (chosen) handleFileChosen(chosen);
                  }}
                />
                {file ? (
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-900">Click to choose a PDF, or drag one here</p>
                    <p className="mt-1 text-xs text-slate-500">Up to 25MB</p>
                  </>
                )}
              </div>

              {file && (
                <div className="space-y-1.5">
                  <Label htmlFor="title">Document title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              )}

              {status === "error" && (
                <p className="text-sm text-red-600">
                  {errorMessage}
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

              <Button className="w-full" disabled={!file || status === "uploading"} onClick={handleUpload}>
                {status === "uploading" ? "Uploading…" : "Upload & continue"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
