"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ARCHETYPES, QUIZ_QUESTIONS, scoreQuiz, type ArchetypeId } from "@/lib/signature-quiz";
import { renderQuizResultCard } from "@/lib/signature-quiz-card";
import { quizShareText, quizShareUrl } from "@/lib/quiz-share";

type Step = "intro" | "question" | "name" | "result";

// Decodes a base64 data: URL into a File without going through fetch().
// This is why the quiz Share button "didn't work" while the signing-
// complete speed-card share did: next.config.ts's CSP has
// `connect-src 'self' https://*.supabase.co ...` — no `data:` — and
// fetch() of a data: URL is governed by connect-src. So fetch(cardUrl)
// threw a CSP violation every time, the catch swallowed it, and the
// button only ever showed the long-press fallback hint. The speed card
// is a real same-origin /api/share/speed-card URL ('self'), which is
// why that one shared fine. atob() decoding involves no network layer,
// so the CSP has nothing to say about it — and it's synchronous, which
// also keeps us safely inside the user-activation window iOS requires
// for navigator.share.
function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return null;
  const meta = dataUrl.slice(0, commaIdx);
  if (!meta.includes("base64")) return null;
  const mime = /^data:([^;,]+)/.exec(meta)?.[1] || "image/png";
  try {
    const binary = atob(dataUrl.slice(commaIdx + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}

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

  // Native file share where supported. This card is a client-only `data:`
  // URI (see renderQuizResultCard), not a real hosted URL like the signing-
  // complete speed card -- which matters here: a synthetic <a download>
  // click on a `data:` URI turned out to be actively unpredictable across
  // iOS contexts, not just unreliable. In Messages' embedded browser it
  // silently did nothing (no JS error, nothing visible). In real mobile
  // Safari it instead popped Safari's own "Do you want to download
  // signature-personality.png on signedby.ai?" interstitial -- technically
  // "working," but it looks nothing like sharing and reads as broken/
  // suspicious to someone who just tapped a button labeled "Share." Neither
  // outcome is acceptable, so the auto-download fallback is gone entirely.
  // If navigator.share (files) isn't available or fails for any reason
  // other than the user cancelling, we just point at the guaranteed-to-work
  // manual option: the result card is already rendered on the page as a
  // plain <img>, and press-and-hold-to-save/share (or right-click-save on
  // desktop) is a native OS/browser gesture, not something this code has to
  // get right on every platform.
  async function handleShare() {
    if (!cardUrl) return;
    setShareFallbackHint(false);
    try {
      // Decoded locally, NOT fetch(cardUrl) — see dataUrlToFile's comment.
      const file = dataUrlToFile(cardUrl, "signature-personality.png");
      if (file && navigator.canShare?.({ files: [file] })) {
        // Text carries the tagged link — see lib/quiz-share.ts for why it isn't
        // navigator.share's `url` field. Without a link the share was a picture
        // with a domain painted on it: nothing to tap, and nothing measurable.
        await navigator.share({
          files: [file],
          text: quizShareText(archetype ? archetype.tagline : ""),
        });
        return;
      }
    } catch (err) {
      // AbortError means the person cancelled the native share sheet --
      // respect that silently, don't show the manual-fallback hint on top.
      if (err instanceof Error && err.name === "AbortError") return;
    }
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
            {/* Yellow to match the homepage's primary CTA and the quiz's own
                end-of-flow "Try SignedBy free" button below — the whole
                funnel should meet the same call to action, not just the
                exit. */}
            <Button size="lg" variant="cta" className="mt-6" onClick={start}>
              Start the quiz →
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
                Press and hold the image above (or right-click on desktop) to save or share it directly.{" "}
                {/* The fallback path is what iOS in-app browsers actually hit,
                    and it previously offered no link at all — so the people
                    most likely to be sharing from a messaging app had nothing
                    to copy. */}
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(quizShareUrl())}
                  className="font-medium text-slate-600 underline underline-offset-2 hover:text-slate-800"
                >
                  Copy the link
                </button>
              </p>
            )}

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Made for you</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{archetype.feature.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{archetype.feature.description}</p>
              {/* A button, not an underlined text link. This is the end of the
                  quiz and the entire conversion moment for the LinkedIn
                  campaign — it was styled as a tertiary link, quieter than
                  every other CTA in the flow. Yellow (same as the intro
                  step's "Start the quiz →" button above and the homepage's
                  primary CTA) so paid traffic meets the same call to action
                  wherever it lands, start to finish. */}
              <Link
                href={archetype.feature.href}
                className={cn(buttonVariants({ variant: "cta", size: "lg" }), "mt-4")}
              >
                Try SignedBy free →
              </Link>
              <p className="mt-2 text-xs text-slate-400">
                No credit card required — 3 free documents every month.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
