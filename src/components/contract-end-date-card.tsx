"use client";

import { useState } from "react";

// New card on the completed-document detail page (CONTRACT_END_DATE_
// REMINDER_SCOPE.md) -- tracks the underlying contract's own end/term
// date (distinct from expires_at, a pre-signature deadline). Free on
// every plan, any tier. Mirrors the payment-link/DocGate editable-in-place
// pattern in field-editor.tsx (boolean + inputs + Save/Cancel) and
// OpenNotificationsToggle's optimistic-fetch shape, adapted for a card of
// its own since this field belongs on the detail page, not the pre-send
// compose flow.
function formatCountdown(dateStr: string): string {
  // Compare at UTC midnight on both sides -- contract_end_date is a plain
  // `date` column with no time-of-day, so this avoids an off-by-one from
  // the viewer's local timezone crossing midnight relative to UTC.
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const [y, m, d] = dateStr.split("-").map(Number);
  const endUtc = Date.UTC(y, m - 1, d);
  const days = Math.round((endUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (days < 0) return `Ended ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  if (days < 30) return `Ends in ${days} days`;
  const months = Math.round(days / 30.44);
  return `Ends in ${months} month${months === 1 ? "" : "s"}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Pulled out to its own module-scope function (matching formatCountdown/
// formatDateLabel above) rather than inlined in the component body -- a
// direct Date.now() call during render trips the React Compiler's purity
// check (react-hooks/purity: "Cannot call impure function during render"),
// same reasoning as this file's other date helpers.
function daysUntil(dateStr: string): number {
  return Math.round((Date.parse(`${dateStr}T00:00:00Z`) - Date.now()) / (1000 * 60 * 60 * 24));
}

export function ContractEndDateCard({
  documentId,
  initialContractEndDate,
}: {
  documentId: string;
  initialContractEndDate: string | null;
}) {
  const [savedDate, setSavedDate] = useState(initialContractEndDate);
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(initialContractEndDate || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/documents/${documentId}/contract-end-date`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_end_date: draftDate }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) {
      setError("Couldn't save, try again");
      return;
    }
    setSavedDate(draftDate || null);
    setEditing(false);
  }

  const days = savedDate ? daysUntil(savedDate) : null;
  const dueSoon = days !== null && days <= 7 && days >= 0;

  return (
    <div
      className="rounded-lg border bg-white p-6"
      style={{ borderColor: dueSoon ? "#fde68a" : "#e2e8f0" }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#475569" strokeWidth="1.7" />
            <path d="M3 9H21" stroke="#475569" strokeWidth="1.7" />
            <path d="M8 2.5V5.5" stroke="#475569" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M16 2.5V5.5" stroke="#475569" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Contract end date
        </h2>
        {!editing && savedDate && (
          <button
            onClick={() => {
              setDraftDate(savedDate);
              setEditing(true);
            }}
            aria-label="Edit contract end date"
            className="inline-flex items-center px-0.5 text-slate-400 hover:text-slate-600"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 20h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path
                d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {editing ? (
        <>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="h-[30px] rounded-md border border-slate-300 px-2 text-[13px] text-slate-900"
            />
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
          <p className="mt-2.5 text-xs text-slate-400">
            Free on every plan — you&apos;ll get an email reminder 1 month and 1 week before this date.
          </p>
        </>
      ) : savedDate ? (
        <>
          <div className="mt-3">
            <p className={`text-xl font-semibold ${dueSoon ? "text-amber-800" : "text-slate-900"}`}>
              {formatDateLabel(savedDate)}
            </p>
            <p className={`mt-1 text-[13px] ${dueSoon ? "text-amber-700" : "text-slate-500"}`}>
              {formatCountdown(savedDate)}
            </p>
          </div>
          {dueSoon ? (
            <div className="mt-3.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
                  stroke="#b45309"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#b45309" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[12.5px] leading-tight text-amber-900">
                Reminder emails go out 1 month and 1 week before this date.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              You&apos;ll get an email reminder 1 month and 1 week before this date.
            </p>
          )}
        </>
      ) : (
        <div className="mt-2.5">
          <p className="text-[13px] text-slate-500">No end date on file for this contract.</p>
          <button
            onClick={() => {
              setDraftDate("");
              setEditing(true);
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Set end date
          </button>
        </div>
      )}
    </div>
  );
}
