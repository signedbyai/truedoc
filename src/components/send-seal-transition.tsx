"use client";

// Brief "Sent"/"Sealed" confirmation popover shown across the navigation
// from a Send or Seal action to the document it lands on (2026-08-05,
// direct ask, mocked up first). Not a click-to-dismiss modal — it appears
// the instant the action succeeds, stays up through the route change, and
// fades out on its own 1 second after the destination page has actually
// loaded underneath it (not on click, not on a fixed timer that could fire
// before the new page is ready — direct instruction).
//
// Mounted once in dashboard/layout.tsx, above {children}, so it survives
// the route change instead of unmounting with the page that triggered it.
// Callers reach it via useSendSealTransition().trigger(kind, href) instead
// of calling router.push themselves — this owns the actual navigation so it
// can track when it resolves.
//
// "The new page has loaded" is approximated by wrapping router.push in
// React's useTransition: isPending stays true for exactly as long as the
// destination route segment's data fetching and render takes (there's no
// loading.tsx under /dashboard to short-circuit that with a skeleton), and
// flips false once the new page has committed to the DOM. The one-second
// hold starts from that flip, not from when trigger() was first called.
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Send, ShieldCheck } from "lucide-react";

type TransitionKind = "sent" | "sealed";

const COPY: Record<TransitionKind, { label: string; sublabel: string }> = {
  sent: { label: "Sent", sublabel: "Opening the document" },
  sealed: { label: "Sealed", sublabel: "Opening the document" },
};

type SendSealTransitionContextValue = {
  trigger: (kind: TransitionKind, href: string) => void;
};

const SendSealTransitionContext = createContext<SendSealTransitionContextValue | null>(null);

export function useSendSealTransition(): SendSealTransitionContextValue {
  const ctx = useContext(SendSealTransitionContext);
  if (!ctx) {
    throw new Error("useSendSealTransition must be used within SendSealTransitionProvider");
  }
  return ctx;
}

export function SendSealTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<TransitionKind | null>(null);
  const [visible, setVisible] = useState(false);
  // Tracks whether the pending flip we're about to see actually belongs to
  // a trigger()-initiated navigation, so an unrelated transition elsewhere
  // on the page can't accidentally start (or skip) the dismiss timer.
  const armedRef = useRef(false);

  function trigger(k: TransitionKind, href: string) {
    setKind(k);
    setVisible(true);
    armedRef.current = true;
    startTransition(() => {
      router.push(href);
    });
  }

  useEffect(() => {
    if (isPending || !armedRef.current) return;
    armedRef.current = false;
    const t = setTimeout(() => setVisible(false), 1000);
    return () => clearTimeout(t);
  }, [isPending]);

  return (
    <SendSealTransitionContext.Provider value={{ trigger }}>
      {children}
      {kind && (
        <div
          aria-hidden={!visible}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 transition-opacity duration-200"
          style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
          onTransitionEnd={() => {
            if (!visible) setKind(null);
          }}
        >
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-7 shadow-lg transition-transform duration-200"
            style={{ transform: visible ? "scale(1)" : "scale(0.94)" }}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                kind === "sealed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
              }`}
            >
              {kind === "sealed" ? (
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Send className="h-6 w-6" aria-hidden="true" />
              )}
            </span>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-900">{COPY[kind].label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{COPY[kind].sublabel}</p>
            </div>
          </div>
        </div>
      )}
    </SendSealTransitionContext.Provider>
  );
}
