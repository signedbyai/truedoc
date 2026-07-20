"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, FileText, Copy, Users, MoreHorizontal, Settings, CreditCard, LogOut, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { OrgSwitcher } from "@/components/org-switcher";
import { ReferralGiftButton } from "@/components/referral-gift-button";
import { FeedbackButton } from "@/components/feedback-button";
import { createClient } from "@/lib/supabase/client";

type NavOrg = { id: string; name: string; plan: string };

// The single navigation shell for every dashboard-family page. Before this,
// the full section nav existed only on /dashboard and every other page fell
// back to a lone "← Dashboard" link — so cross-section moves round-tripped
// through home, and mobile had no nav at all. This replaces all seven pages'
// hand-rolled headers: persistent top bar on desktop, fixed floating pill on
// mobile. Primary sections (Home/Documents/Templates/Team) are the tabs;
// account-ish destinations (Settings/Billing/Log out) live in the desktop
// account menu and the mobile "More" sheet.

type Section = { label: string; href: string; icon: LucideIcon; match: (p: string) => boolean };

const PRIMARY: Section[] = [
  { label: "Home", href: "/dashboard", icon: Home, match: (p) => p === "/dashboard" },
  { label: "Documents", href: "/dashboard/documents", icon: FileText, match: (p) => p.startsWith("/dashboard/documents") },
  { label: "Templates", href: "/dashboard/templates", icon: Copy, match: (p) => p.startsWith("/dashboard/templates") },
  { label: "Team", href: "/dashboard/team", icon: Users, match: (p) => p.startsWith("/dashboard/team") },
];

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}

export function DashboardNav({
  orgs,
  activeOrgId,
  userEmail,
  firstName,
}: {
  orgs: NavOrg[];
  activeOrgId: string;
  userEmail: string;
  firstName: string | null;
}) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Auto-hide the top bar on both breakpoints: slide it away when scrolling
  // down, bring it back on any upward flick (and always show near the very
  // top). On mobile the bottom pill remains as persistent nav; on desktop this
  // is strictly better than the old behavior (bar scrolled away and only
  // returned at the very top). Single rAF-throttled window scroll listener
  // drives both the mobile and desktop headers.
  const [hideTopBar, setHideTopBar] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y < 16) setHideTopBar(false);
        else if (Math.abs(delta) > 8) setHideTopBar(delta > 0);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const settingsActive = pathname.startsWith("/dashboard/settings");
  const billingActive = pathname.startsWith("/dashboard/billing");

  return (
    <>
      {/* ===== Desktop: top bar — auto-hides on scroll down, same as mobile ===== */}
      <header
        data-dashboard-chrome
        className={
          "sticky top-0 z-20 hidden border-b border-slate-200 bg-white transition-transform duration-300 md:block " +
          (hideTopBar ? "-translate-y-full" : "translate-y-0")
        }
      >
        {/* Full-width, not `mx-auto max-w-5xl` — that centered the whole bar
            to match the page content below it, which meant the logo drifted
            rightward as the window grew past that breakpoint instead of
            staying put like the mobile header (a plain `w-full` bar) does.
            Pinning both flex groups to the true edges here keeps the logo
            fixed regardless of width; page content can still be independently
            centered/max-width'd below without the header tracking it. */}
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" aria-label="SignedBy home">
              <Logo />
            </Link>
            <nav className="flex items-center gap-6">
              {PRIMARY.map((s) => {
                const active = s.match(pathname);
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      // h-14 + items-center rather than py-4: the link has to
                      // span the header's full height for the indicator to sit
                      // on its bottom border. With padding alone it stopped a
                      // couple of pixels short and the line floated.
                      "relative flex h-14 items-center text-sm transition-colors " +
                      (active
                        ? "font-medium text-slate-900"
                        : "font-medium text-slate-500 hover:text-slate-900")
                    }
                  >
                    {s.label}
                    {/* Clean 3px rule on the header's bottom edge. Replaced a
                        deliberately hand-drawn marker stroke (rotated, uneven
                        radii, overhanging the word) — it was aiming for
                        personality but read as untidy against otherwise precise
                        chrome.

                        3px, not 2: yellow is light, and at 2px it reads as a
                        pale hairline rather than an accent. Dark indicators can
                        be thinner; this one can't.

                        -bottom-px, not bottom-0, so it covers the header's own
                        1px border instead of stacking on top of it. Otherwise
                        you get a yellow line with a grey line directly beneath,
                        which is the sort of near-miss that reads as unfinished.

                        Width is the label, not wider: a tab-width indicator
                        implies panels you switch between, and these are links
                        to separate pages. */}
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-x-0 -bottom-px h-[3px] bg-yellow-300"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ReferralGiftButton variant="label" />
            <FeedbackButton variant="pill" firstName={firstName} />
            <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                aria-label="Account menu"
                aria-expanded={accountOpen}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {initials(firstName, userEmail)}
              </button>
              {accountOpen && (
                <>
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setAccountOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                    <p className="truncate px-3 py-1.5 text-xs text-slate-500">{userEmail}</p>
                    <div className="my-1 border-t border-slate-100" />
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setAccountOpen(false)}
                      className={
                        "flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 " +
                        (settingsActive ? "font-medium text-slate-900" : "text-slate-700")
                      }
                    >
                      <Settings className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
                      Settings
                    </Link>
                    <Link
                      href="/dashboard/billing"
                      onClick={() => setAccountOpen(false)}
                      className={
                        "flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 " +
                        (billingActive ? "font-medium text-slate-900" : "text-slate-700")
                      }
                    >
                      <CreditCard className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
                      Billing
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <LogOut className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== Mobile: top bar (logo + gift) — auto-hides on scroll down ===== */}
      <header
        data-dashboard-chrome
        className={
          "sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 transition-transform duration-300 md:hidden " +
          (hideTopBar ? "-translate-y-full" : "translate-y-0")
        }
      >
        <Link href="/dashboard" aria-label="SignedBy home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <ReferralGiftButton variant="icon" />
          <FeedbackButton variant="icon" firstName={firstName} />
        </div>
      </header>

      {/* ===== Mobile: fixed floating pill ===== */}
      <nav
        aria-label="Primary"
        data-dashboard-chrome
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-1.5 shadow-[0_6px_20px_rgba(15,23,41,0.16)] backdrop-blur">
          {PRIMARY.map((s) => {
            const active = s.match(pathname);
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors " +
                  (active ? "bg-slate-900 text-white" : "text-slate-500")
                }
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {active && <span>{s.label}</span>}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className={
              "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium " +
              (settingsActive || billingActive ? "bg-slate-900 text-white" : "text-slate-500")
            }
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
            {(settingsActive || billingActive) && <span>More</span>}
          </button>
        </div>
      </nav>

      {/* ===== Mobile: "More" sheet ===== */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-900/40"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">More</p>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            {orgs.length > 1 && (
              <div className="mb-3">
                <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />
              </div>
            )}
            <Link
              href="/dashboard/settings"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm text-slate-800 hover:bg-slate-50"
            >
              <Settings className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
              Settings
            </Link>
            <Link
              href="/dashboard/billing"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm text-slate-800 hover:bg-slate-50"
            >
              <CreditCard className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
              Billing
            </Link>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left text-sm text-slate-800 hover:bg-slate-50"
            >
              <LogOut className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
              Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
