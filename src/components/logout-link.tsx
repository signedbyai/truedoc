"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Deliberately faint/small relative to the real nav links next to it (see
// OrgSwitcher, which this always sits beside) -- this is the "least
// obtrusive" placement option: present on every dashboard-family page,
// but styled to recede rather than compete for attention. There was no
// sign-out control anywhere in the app before this.
export function LogoutLink() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full navigation (not router.push) so every bit of client state tied
    // to the old session is gone, same pattern as the login page's
    // post-sign-in redirect.
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="text-xs font-medium text-slate-400 hover:text-slate-600 disabled:opacity-50"
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
