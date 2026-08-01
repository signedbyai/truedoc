import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { FlagValues } from "flags/react";
import Image from "next/image";
import { Zap } from "lucide-react";
import { CtaLink } from "@/components/cta-link";
import { ctaColorFlag } from "@/flags";

const TITLE = "SignedBy API — wire e-signature into your CRM or app";
const DESCRIPTION =
  "REST API and outbound webhooks, starting on the $7/mo Pro plan (metered) and fully unlimited on Business ($29/mo) — no separate developer plan. Create and send documents from your CRM, get notified on sign/complete, and connect via Make.";

// This page has its own opengraph-image.tsx (route-scoped, next to this
// file) — same as /magic-quote, openGraph/twitter here omit `images`
// entirely and let Next auto-merge the file-based convention image.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/developers" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://signedby.ai/developers" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
      {children}
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-3xl scroll-mt-8 px-6 py-10 border-t border-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-6 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function Endpoint({
  method,
  path,
  description,
  request,
  response,
}: {
  method: string;
  path: string;
  description: string;
  request?: string;
  response: string;
}) {
  const methodColor =
    method === "GET" ? "bg-blue-50 text-blue-700" : method === "POST" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700";
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${methodColor}`}>{method}</span>
        <code className="text-sm font-medium text-slate-900">{path}</code>
      </div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {request && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Request</p>
          <CodeBlock>{request}</CodeBlock>
        </>
      )}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Response</p>
      <CodeBlock>{response}</CodeBlock>
    </div>
  );
}

function Tool({ name, description }: { name: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <code className="text-sm font-medium text-slate-900">{name}</code>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

const FOOTER_LINKS = (
  <p className="mt-2 space-x-4">
    <Link href="/vs/signnow" className="hover:text-slate-600">
      SignedBy vs SignNow
    </Link>
    <Link href="/vs/docusign" className="hover:text-slate-600">
      SignedBy vs DocuSign
    </Link>
    <Link href="/vs/pandadoc" className="hover:text-slate-600">
      SignedBy vs PandaDoc
    </Link>
    <Link href="/vs/hix" className="hover:text-slate-600">
      SignedBy vs Hix
    </Link>
    <Link href="/vs/bolosign" className="hover:text-slate-600">
      SignedBy vs BoloSign
    </Link>
    <Link href="/templates" className="hover:text-slate-600">
      Free templates
    </Link>
    <Link href="/pricing" className="hover:text-slate-600">
      Pricing
    </Link>
    <Link href="/terms" className="hover:text-slate-600">
      Terms
    </Link>
    <Link href="/privacy" className="hover:text-slate-600">
      Privacy
    </Link>
  </p>
);

export default async function DevelopersPage() {
  const ctaColor = await ctaColorFlag();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <FlagValues values={{ "cta-color": ctaColor }} />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Image src="/brand/signedby-lockup-yellow-badge-beta-micro-small.png" alt="SignedBy" width={266} height={64} className="h-7 w-auto" priority />
        </Link>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Build on SignedBy. Fast.{" "}
          <Zap className="inline-block h-8 w-8 -translate-y-0.5 fill-yellow-300 text-yellow-300 sm:h-9 sm:w-9" aria-hidden="true" />
        </h1>
        <p className="max-w-xl text-lg text-slate-600">
          A REST API and outbound webhooks for wiring SignedBy into your CRM, app, or onboarding flow — create and
          send documents, get notified the moment one&apos;s signed, and sync it all back automatically. Starts on
          the $7/mo Pro plan (50 free document-sends a month, then billed per document) and becomes fully
          unlimited on Business ($29/mo) — no separate developer plan to buy first.
        </p>
        <CtaLink href="/login?intent=signup" color={ctaColor} page="developers" position="hero">
          Start for free →
        </CtaLink>
        <p className="text-xs text-slate-400">No credit card required — 3 free documents every month to try it.</p>
      </section>

      {/* Hero shot, same composition as the homepage's (see homepage-current.tsx's
          comment for the full reasoning): a wide "product" frame with the
          signer's phone overlapping its bottom-right corner. The homepage's
          version shows the field editor, since that's the sender's half of the
          product; this page's audience is a developer, so the equivalent frame
          is a real API call and its response, not the editor — the phone half
          is identical to the homepage's, reused as-is, since the signer's
          experience is the same no matter how the document was created.
          Rendered as a styled terminal rather than a screenshot: there's no
          actual "terminal app UI" to photograph for proof the way there is a
          real editor to screenshot, and the request/response text itself
          (copied verbatim from the endpoint reference below) is the proof. */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-12 sm:pr-12">
        <div className="relative mx-auto max-w-[40rem]">
          <div className="w-[82%] overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-8px_rgba(15,23,42,0.12)] sm:w-full">
            <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" aria-hidden="true" />
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-relaxed text-slate-300 sm:text-xs">
              <code>
                <span className="text-slate-500">$ </span>
                <span className="text-slate-100">curl -X POST https://signedby.ai/api/v1/documents \</span>
                {"\n  "}
                <span className="text-slate-100">-H &quot;Authorization: Bearer sb_live_...&quot; \</span>
                {"\n  "}
                <span className="text-slate-100">
                  -d &apos;&#123;&quot;template_id&quot;:&quot;3c78a1e4-...&quot;,&quot;signer&quot;:&#123;&quot;email&quot;:&quot;jane@acme.com&quot;&#125;&#125;&apos;
                </span>
                {"\n\n"}
                <span className="text-slate-500">{"{"}</span>
                {"\n  "}
                <span className="text-sky-400">&quot;id&quot;</span>
                <span className="text-slate-500">: </span>
                <span className="text-emerald-400">&quot;7fdd90eb-9152-4031-a767-c0632126dc53&quot;</span>
                <span className="text-slate-500">,</span>
                {"\n  "}
                <span className="text-sky-400">&quot;status&quot;</span>
                <span className="text-slate-500">: </span>
                <span className="text-yellow-300">&quot;sent&quot;</span>
                {"\n"}
                <span className="text-slate-500">{"}"}</span>
              </code>
            </pre>
          </div>
          <div className="absolute -bottom-6 right-0 w-[30%] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:-right-6 sm:w-[28%] lg:-right-10 lg:w-[30%]">
            <Image
              src="/hero-signer-mobile.png"
              alt="The signer's side of the same API call: a handwritten signature drawn in the signature pad on a phone, with a yellow slide-to-sign bar ready to submit"
              width={1236}
              height={2370}
              sizes="(min-width: 1024px) 12rem, (min-width: 640px) 11rem, 30vw"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-4 text-center">
        <p className="text-sm text-slate-600">
          Already works with <strong>Pipedrive</strong>, <strong>HubSpot</strong>, <strong>Airtable</strong>,{" "}
          <strong>Notion</strong>, <strong>Attio</strong>, <strong>Brevo</strong>, and 1,500+ other apps via Make —
          see the <Link href="#pipedrive" className="underline">Pipedrive walkthrough</Link> below.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Each is a trademark of its respective owner; SignedBy is not affiliated with or endorsed by any of them —
          they&apos;re reachable via Make&apos;s own connectors to each, not a native SignedBy integration.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Starts on Pro ($7/mo)</p>
            <p className="mt-1 text-xs text-slate-600">
              No separate developer plan or per-seat API tier — 50 free document-sends a month on Pro/Team,
              fully unlimited (plus webhooks) on Business ($29/mo). See how that compares to DocuSign, SignNow,
              and PandaDoc on our <Link href="/vs/docusign" className="underline">comparison pages</Link>.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">REST + webhooks</p>
            <p className="mt-1 text-xs text-slate-600">Plain JSON over HTTPS, HMAC-signed outbound events. No SDK required.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">No sandbox needed</p>
            <p className="mt-1 text-xs text-slate-600">The free tier's 3 documents/month is real enough to build and test against.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Rate limit</p>
            <p className="mt-1 text-xs text-slate-600">60 document creates per hour per org — plenty for real usage, generous for testing.</p>
          </div>
        </div>
      </section>

      <Section id="auth" title="Authentication">
        <p>
          Generate a key from Settings → Integration &amp; API — every plan can generate one now, including Free.
          Send it as a bearer token on every request:
        </p>
        <CodeBlock>{`Authorization: Bearer sb_live_...`}</CodeBlock>
        <p>
          Missing or invalid keys get a 401. What happens after that depends on your plan: Business is unlimited,
          Pro and Team are metered (50 free document-sends/month, then billed per document — see{" "}
          <Link href="/console" className="underline">/console</Link> for pricing), and Free is capped at the same
          3 documents/month the dashboard gives you:
        </p>
        <CodeBlock>{`401  { "error": "Missing API key. Pass it as 'Authorization: Bearer <key>'." }
401  { "error": "Invalid API key." }
402  { "error": "You've hit the Free plan's 3 documents/month limit. Upgrade to keep going." }`}</CodeBlock>
      </Section>

      <Section id="endpoints" title="Endpoints">
        <div className="space-y-6">
          <Endpoint
            method="POST"
            path="/api/v1/documents"
            description="Create a document from a template and send it to one signer."
            request={`curl -X POST https://signedby.ai/api/v1/documents \\
  -H "Authorization: Bearer sb_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "3c78a1e4-dc56-4769-87f6-65e344dd6d8f",
    "signer": { "email": "jane@acme.com", "name": "Jane", "auth_required": false },
    "expires_at": "2026-08-15T00:00:00Z",
    "invite_subject": "Please sign your Acme agreement",
    "invite_message": "Thanks for your business — just one form to go."
  }'`}
            response={`201
{
  "id": "7fdd90eb-9152-4031-a767-c0632126dc53",
  "status": "sent",
  "expires_at": "2026-08-15T00:00:00Z",
  "auth_required": false
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/documents"
            description="Multi-party version — send the same template to 2+ role-tagged signers in one call. 'role' maps to the template's Party 1 / Party 2 / … field assignments."
            request={`curl -X POST https://signedby.ai/api/v1/documents \\
  -H "Authorization: Bearer sb_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "3c78a1e4-dc56-4769-87f6-65e344dd6d8f",
    "signers": [
      { "role": 0, "email": "buyer@acme.com",  "name": "Buyer",  "auth_required": true  },
      { "role": 1, "email": "seller@acme.com", "name": "Seller", "auth_required": false }
    ]
  }'`}
            response={`201
{
  "id": "643d45b3-...",
  "status": "sent",
  "expires_at": null,
  "signers": [
    { "id": "...", "role": 0, "email": "buyer@acme.com",  "auth_required": true  },
    { "id": "...", "role": 1, "email": "seller@acme.com", "auth_required": false }
  ]
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/documents?status=completed&limit=20&offset=0"
            description="List/search the org's documents. status is optional (draft, sent, completed, declined, voided); limit defaults to 20, max 100."
            request={`curl "https://signedby.ai/api/v1/documents?status=completed&limit=20" \\
  -H "Authorization: Bearer sb_live_..."`}
            response={`200
{
  "documents": [
    { "id": "...", "title": "Freelance Agreement", "status": "completed",
      "created_at": "2026-07-28T10:04:00Z", "updated_at": "2026-07-29T09:11:00Z",
      "expires_at": null }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0,
  "has_more": true
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/documents/{id}"
            description="Get a single document's status and its signers' progress."
            request={`curl https://signedby.ai/api/v1/documents/<document-id> \\
  -H "Authorization: Bearer sb_live_..."`}
            response={`200
{
  "id": "...",
  "title": "Freelance Agreement",
  "status": "completed",
  "created_at": "2026-07-28T10:04:00Z",
  "updated_at": "2026-07-29T09:11:00Z",
  "expires_at": null,
  "signers": [
    { "email": "jane@acme.com", "name": "Jane", "status": "signed",
      "signed_at": "2026-07-29T09:11:00Z", "auth_required": false, "auth_verified": false }
  ]
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/templates"
            description="List the org's templates, for populating a dropdown in your own UI or a Make scenario."
            request={`curl https://signedby.ai/api/v1/templates \\
  -H "Authorization: Bearer sb_live_..."`}
            response={`200
{
  "templates": [
    { "id": "3c78a1e4-...", "name": "Freelance Agreement", "page_count": 3,
      "created_at": "2026-07-01T12:00:00Z" }
  ]
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/documents/{id}/signed-file"
            description="Download the completed, flattened PDF once every signer has signed. 404 until it's ready."
            request={`curl https://signedby.ai/api/v1/documents/<document-id>/signed-file \\
  -H "Authorization: Bearer sb_live_..." -o signed.pdf`}
            response={`200  <binary PDF>
404  { "error": "Signed PDF isn't ready yet." }`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/documents/{id}/void"
            description="Cancel a document that's out for signature — e.g. 'deal fell through, kill the pending contract.' Only works while status is 'sent'."
            request={`curl -X POST https://signedby.ai/api/v1/documents/<document-id>/void \\
  -H "Authorization: Bearer sb_live_..."`}
            response={`200  { "success": true }
400  { "error": "Only documents that are out for signature can be voided." }`}
          />
        </div>
      </Section>

      <Section id="webhooks" title="Webhooks">
        <p>
          Available on Pro and higher (previously Business-only). Register one or more endpoint URLs in Settings →
          Webhooks (each gets its own signing secret). Every enabled endpoint receives all four document lifecycle
          events:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code>document.viewed</code> — the signer opened the link for the first time
          </li>
          <li>
            <code>document.signed</code> — one signer completed their part (fires per signer, not just once)
          </li>
          <li>
            <code>document.completed</code> — every signer has finished
          </li>
          <li>
            <code>document.declined</code> — a signer declined to sign
          </li>
        </ul>
        <p>Payload shape — signer is omitted on document.completed, since that event isn&apos;t about one recipient:</p>
        <CodeBlock>{`{
  "event": "document.signed",
  "occurred_at": "2026-07-30T09:02:11.000Z",
  "document_id": "7fdd90eb-9152-4031-a767-c0632126dc53",
  "title": "Freelance Agreement",
  "status": "sent",
  "signer": { "email": "jane@acme.com", "name": "Jane" }
}`}</CodeBlock>
        <p>
          Each delivery is signed with your endpoint&apos;s own secret via an <code>X-SignedBy-Signature</code>{" "}
          header:
        </p>
        <CodeBlock>{`X-SignedBy-Signature: sha256=6f2c9e...`}</CodeBlock>
        <p>Verify it (Node.js) before trusting the payload:</p>
        <CodeBlock>{`const crypto = require("crypto");

function verify(rawBody, signatureHeader, secret) {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}`}</CodeBlock>
        <p className="text-slate-600">
          Delivery is fire-and-forget with one retry after a 1-second delay (5-second timeout per attempt) — there&apos;s
          no persistent delivery log or manual-redelivery UI yet, so make your endpoint idempotent and check the
          document&apos;s current status via <code>GET /api/v1/documents/&#123;id&#125;</code> if you need to reconcile a
          missed event.
        </p>
      </Section>

      <Section id="mcp" title="MCP server (for AI agents)">
        <p>
          SignedBy also runs a real Model Context Protocol (MCP) server at <code>/api/mcp</code> — six tools show up
          ready to call, wrapping the same endpoints above. No custom integration code: an MCP client just needs the
          URL and your API key.
        </p>

        <div>
          <p className="font-medium text-slate-900">Mistral Le Chat</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
            <li>Connectors → + Add Connector → the &quot;Custom MCP Connector&quot; tab</li>
            <li>
              Name it (e.g. <code>signedby</code>) and paste the server URL: <code>https://signedby.ai/api/mcp</code>
            </li>
            <li>Le Chat detects it needs an HTTP Bearer Token and prompts for one — paste your SignedBy API key</li>
          </ul>
        </div>

        <div>
          <p className="font-medium text-slate-900">Claude Code / Claude Desktop</p>
          <p className="mt-2 text-slate-600">Add this to your MCP config:</p>
          <CodeBlock>{`{
  "mcpServers": {
    "signedby": {
      "url": "https://signedby.ai/api/mcp",
      "headers": { "Authorization": "Bearer sb_live_..." }
    }
  }
}`}</CodeBlock>
        </div>

        <p>
          The signer&apos;s side is completely unchanged — an AI agent can trigger a signing request through these
          tools, but the recipient still has to open the link and sign it themselves, through the same per-recipient
          verification as every other document. Every document an agent creates or voids through this server is
          tagged in the audit trail (an <code>agent_triggered</code> flag alongside the usual event log), so it&apos;s
          always possible to tell an agent-initiated send apart from one a person sent directly.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Tool name="list_templates" description="List the org's templates, to find a template_id for create_and_send_document." />
          <Tool
            name="create_and_send_document"
            description="Create a document from a template and send it to one signer. Triggers the send only — the signer still opens the link and signs it themselves."
          />
          <Tool name="get_document_status" description="Look up a document's status and each signer's status by id." />
          <Tool name="list_documents" description="List the org's documents, optionally filtered by status." />
          <Tool name="void_document" description="Cancel a document that's still out for signature (status must be 'sent')." />
          <Tool name="get_signed_file" description="Download the completed, signed PDF once every signer has finished." />
        </div>
        <p className="text-slate-600">
          Requires the Pro plan or higher — this rides on{" "}
          <Link href="/console" className="underline">
            Console&apos;s
          </Link>{" "}
          metered access (50 free document-sends/month, then billed per document), same metering on every plan
          including Business — not the plain REST API access described in Authentication above, which is metered
          on Pro/Team and unlimited on Business. See <Link href="/console" className="underline">/console</Link>{" "}
          for the full pricing.
        </p>
      </Section>

      <Section id="make" title="Connect via Make">
        <p>
          There&apos;s no native SignedBy app in Make&apos;s marketplace yet — you don&apos;t need one for either
          direction:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">SignedBy → Make</p>
            <p className="mt-2 text-xs text-slate-600">
              Add a <strong>Custom Webhook</strong> trigger module in Make, copy the URL it gives you, and paste it
              into Settings → Webhooks. Nothing to build on our side.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Make → SignedBy</p>
            <p className="mt-2 text-xs text-slate-600">
              Use Make&apos;s generic <strong>HTTP — Make a request</strong> module, with your API key as an{" "}
              <code>Authorization: Bearer</code> header, against any endpoint above.
            </p>
          </div>
        </div>
      </Section>

      <Section id="pipedrive" title="How-to: Pipedrive, both directions">
        <p>
          A worked example using Make to connect a Pipedrive deal to a SignedBy contract, start to finish — adapt the
          same shape for HubSpot, Airtable, or any other CRM.
        </p>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">1. Deal reaches "Contract sent" → send the contract</p>
            <p className="mt-2 text-xs text-slate-600">
              In Make: a Pipedrive trigger watching for deals entering your "Contract sent" stage, feeding into an{" "}
              <strong>HTTP — Make a request</strong> module that calls{" "}
              <code>POST /api/v1/documents</code> with the deal&apos;s contact as the <code>signer</code>. The
              contract is out for signature the moment the deal moves stage — no one has to remember to send it.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">2. Contract signed → update the deal</p>
            <p className="mt-2 text-xs text-slate-600">
              A second Make scenario: a <strong>Custom Webhook</strong> trigger listening for{" "}
              <code>document.completed</code>, feeding into Pipedrive&apos;s <strong>Update a Deal</strong> (or{" "}
              <strong>Create a Note</strong>) module — logging that the contract came back signed, or moving the
              deal to its next stage automatically.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Pipedrive is a trademark of its respective owner; SignedBy is not affiliated with or endorsed by Pipedrive
          or Make.
        </p>
      </Section>

      <Section id="faq" title="FAQ &amp; gotchas">
        <div className="space-y-4">
          <div>
            <p className="font-medium text-slate-900">What format does expires_at need?</p>
            <p className="mt-1 text-slate-600">
              A full UTC ISO-8601 datetime ending in <code>Z</code> — e.g. <code>2026-08-15T00:00:00Z</code>. A
              timezone offset like <code>+02:00</code> is rejected; convert to UTC first.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900">How does multi-party role numbering work?</p>
            <p className="mt-1 text-slate-600">
              <code>role</code> matches the Party 1 / Party 2 / … assignments already on the template — role{" "}
              <code>0</code> is Party 1, role <code>1</code> is Party 2, and so on. Every role actually used on the
              template needs a matching signer, or the request is rejected up front.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900">Is there a sandbox or test mode?</p>
            <p className="mt-1 text-slate-600">
              No — the free tier&apos;s 3 documents/month is real enough to build and test integrations against
              before upgrading.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900">What happens with auth_required signers?</p>
            <p className="mt-1 text-slate-600">
              That signer has to enter a one-time email code before the document opens at all — same per-recipient
              verification the dashboard offers, free on every plan.
            </p>
          </div>
        </div>
      </Section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-20 pt-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Ready to build?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Sign up free — you can generate a key today. Upgrade to Pro ($7/mo) for real usage, or Business
          ($29/mo) for unlimited access and webhooks.
        </p>
        <CtaLink href="/login?intent=signup" className="mt-5" color={ctaColor} page="developers" position="footer">
          Start for free →
        </CtaLink>
      </section>

      <footer className="mt-auto border-t border-slate-100 px-6 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SignedBy. signedby.ai</p>
        <p className="mt-1">A trading name of SPRK10 B.V. KVK 98888625</p>
        {FOOTER_LINKS}
      </footer>
    </main>
  );
}
