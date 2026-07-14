// Renders the audit_events log (see supabase/migrations/0001_init.sql) as a
// human-readable history feed. Purely presentational — the events are
// fetched server-side by the page and passed in already scoped/ordered.
type SignerRef = { name: string | null; email: string };

export type AuditEvent = {
  id: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  signers: SignerRef | SignerRef[] | null;
};

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function describeEvent(event: AuditEvent): string {
  const signer = firstOf(event.signers);
  const who = signer ? signer.name || signer.email : null;
  const metadata = event.metadata || {};

  switch (event.event_type) {
    case "created":
      return "Document created";
    case "sent": {
      const count = typeof metadata.signer_count === "number" ? metadata.signer_count : null;
      return count ? `Sent for signature to ${count} signer${count === 1 ? "" : "s"}` : "Sent for signature";
    }
    case "viewed":
      return who ? `${who} viewed the document` : "Viewed by a signer";
    case "consent_given":
      return who ? `${who} agreed to sign electronically` : "E-signature consent given";
    case "signed":
      return who ? `${who} signed` : "Signed";
    case "declined": {
      const reason = typeof metadata.reason === "string" && metadata.reason ? metadata.reason : null;
      return who ? `${who} declined to sign${reason ? ` — "${reason}"` : ""}` : "Declined to sign";
    }
    case "completed":
      return "Completed — every signer has signed";
    case "voided":
      return "Voided by sender";
    case "payment_link_clicked":
      return who ? `${who} clicked the payment link` : "Payment link clicked";
    case "docgate_clicked": {
      const details = ["device_type", "city", "region"]
        .map((key) => (typeof metadata[key] === "string" ? (metadata[key] as string) : null))
        .filter(Boolean)
        .join(", ");
      return who
        ? `${who} clicked the document gate link${details ? ` (${details})` : ""}`
        : `Document gate link clicked${details ? ` (${details})` : ""}`;
    }
    default:
      return event.event_type;
  }
}

export function AuditTrail({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative text-sm">
          <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-slate-400" />
          <p className="text-slate-800">{describeEvent(event)}</p>
          <p className="text-xs text-slate-400">{new Date(event.created_at).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  );
}
