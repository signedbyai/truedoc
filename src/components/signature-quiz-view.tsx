"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ARCHETYPES, QUIZ_QUESTIONS, scoreQuiz, type ArchetypeId } from "@/lib/signature-quiz";
import { renderQuizResultCard } from "@/lib/signature-quiz-card";

type Step = "intro" | "question" | "name" | "result";

export function SignatureQuizView() {
  const [step, setStep] = useState<Step>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ArchetypeId[]>([]);
  const [name, setName] = useState("");
  // True once we've fallen through to the synthetic-download fallback below
  // -- see handleShare's comment for why that fallback can silently do
  // nothing on iOS (especially inside in-app browsers like Messages' link
  // preview), unlike on desktop where it just works. Surfaces a guaranteed
  // fallback (long-press the already-rendered <img> below) instead of
  // leaving the Share button looking broken with no explanation.
  const [shareFallbackHint, setShareFallbackHint] = useState(false);

  const archetype = useMemo(() => {
    if (answers.length === 0) return null;
    return ARCHETYPES[scoreQuiz(answers)];
  }, [answers]);

  // Computed during render rather than in an effect -- canvas-to-dataURL is
  // a pure computation from (name, archetype) as far as React's concerned
  // (the offscreen <canvas> it creates is local and thrown away, nothing
  // shared/external gets mutated), so there's no synchronization-with-an-
  // external-system need that would call for useEffect here. Browser-only,
  // but useMemo still runs safely client-side-only since this whole
  // component is "use client" and only ever renders after hydration.
  const cardUrl = useMemo(() => {
    if (step !== "result" || !archetype) return null;
    return renderQuizResultCard({ name, archetype });
  }, [step, archetype, name]);

  function start() {
    setAnswers([]);
    setQuestionIndex(0);
    setStep("question");
  }

  function answer(archetypeId: ArchetypeId) {
    const next = [...answers, archetypeId];
    setAnswers(next);
    if (questionIndex + 1 < QUIZ_QUESTIONS.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setStep("name");
    }
  }

  function goBack() {
    if (questionIndex === 0) {
      setStep("intro");
      return;
    }
    setAnswers(answers.slice(0, -1));
    setQuestionIndex(questionIndex - 1);
  }

  function seeResult() {
    setStep("result");
  }

  function retake() {
    setAnswers([]);
    setQuestionIndex(0);
    setName("");
    setStep("intro");
  }

  // Same one-tap share pattern as the signing-complete speed stat
  // (src/components/signing-view.tsx's handleShareSpeedStat): native file
  // share where supported, plain PNG download otherwise. This card is a
  // client-only `data:` URI (see renderQuizResultCard), not a real hosted
  // URL like the speed card -- which matters here: a synthetic <a download>
  // click on a `data:` URI is markedly less reliable on iOS than on a real
  // https:// URL, and some in-app browsers (Safari's embedded view inside
  // Messages, for instance) block or silently no-op data: URI navigation
  // entirely as a security measure. When that happens there's no JS error
  // to catch -- it just does nothing, which is exactly what got reported.
  // So: still attempt the download (harmless on platforms where it works),
  // but also surface a fallback hint that's guaranteed to work everywhere --
  // the result card is already rendered on the page as a plain <img>, and
  // long-press-to-save/share is a native OS gesture, not something this
  // code has to get right.
  async function handleShare() {
    if (!cardUrl) return;
    setShareFallbackHint(false);
    try {
      const resp = await fetch(cardUrl);
      const blob = await resp.blob();
      const file = new File([blob], "signature-personality.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: archetype ? archetype.tagline : undefined });
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }
    } catch {
      // fall through to download
    }
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = "signature-personality.png";
    a.click();
    setShareFallbackHint(true);
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-lg">
        <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← SignedBy
        </Link>

        {step === "intro" && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">What does your signature say about you?</h1>
            <p className="mt-3 text-sm text-slate-600">
              8 quick questions about how you sign things. No email required, takes about a minute.
            </p>
            <Button size="lg" className="mt-6" onClick={start}>
              Start the quiz
            </Button>
          </div>
        )}

        {step === "question" && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8">
            <div className="mb-6 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{ width: `${(questionIndex / QUIZ_QUESTIONS.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-400">
                {questionIndex + 1}/{QUIZ_QUESTIONS.length}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{QUIZ_QUESTIONS[questionIndex].prompt}</h2>
            <div className="mt-5 flex flex-col gap-2.5">
              {QUIZ_QUESTIONS[questionIndex].options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => answer(option.archetype)}
                  className="rounded-lg border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={goBack}
              className="mt-5 text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              ← Back
            </button>
          </div>
        )}

        {step === "name" && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-900">Almost there</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your name so we can show it in your matched signature style.
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-4"
              maxLength={40}
              onKeyDown={(e) => e.key === "Enter" && seeResult()}
            />
            <Button size="lg" className="mt-4 w-full" onClick={seeResult}>
              See my result
            </Button>
          </div>
        )}

        {step === "result" && archetype && (
          <div className="mt-6">
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">You are</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">{archetype.title}</h1>
              <p className="mt-3 text-sm text-slate-600">{archetype.description}</p>
            </div>

            {cardUrl && (
              /* eslint-disable-next-line @next/next/no-img-element -- client-generated canvas data URL, not a static asset next/image can optimize */
              <img
                src={cardUrl}
                alt={`${archetype.title} — ${archetype.tagline}`}
                className="mt-4 w-full rounded-xl border border-slate-200"
              />
            )}

            <div className="mt-4 flex gap-2.5">
              <Button size="lg" className="flex-1" onClick={handleShare}>
                Share
              </Button>
              <Button size="lg" variant="outline" onClick={retake}>
                Retake
              </Button>
            </div>

            {shareFallbackHint && (
              <p className="mt-2.5 text-center text-xs text-slate-500">
                Didn&apos;t open a share sheet or download? Press and hold the image above to save or share it
                directly.
              </p>
            )}

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Made for you</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{archetype.feature.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{archetype.feature.description}</p>
              <Link
                href={archetype.feature.href}
                className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
              >
                Try SignedBy free →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
