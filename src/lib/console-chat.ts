import {
  sendDocumentAction,
  bulkSendAction,
  checkStatusAction,
  listDocumentsAction,
  listTemplatesAction,
  voidDocumentAction,
  saveAsTemplateAction,
  getReferralInfoAction,
} from "@/lib/console-actions";
import { sealDocumentAction } from "@/lib/verified-badge-actions";

// The console chat's Mistral function-calling loop (CONSOLE_UX_SCOPE.md #2).
// Deliberately its own module rather than an extension of ai-provider.ts's
// generateAIText — that function is a single-turn, no-tools, plain-text
// abstraction shared by field-suggestion/drafting/summarization, and this
// needs multi-turn history plus tool calling, a different enough shape that
// bolting it on risked regressing those stable call sites. Mistral-only for
// v1 (BYOK is an explicit phase-2 fast-follow, not built here).

export type ChatMessage = { role: "user" | "assistant"; content: string };

// save_as_template (2026-08-01, console upload-a-template) is confirm-only
// like the other two, but deliberately absent from TOOLS below — it's
// never something Mistral decides to call on its own. The chat UI builds
// the confirm bubble itself (document id + AI-suggested fields it already
// has from the upload it just ran), the same way a raw id is never allowed
// to reach the model. See saveAsTemplateAction's doc comment.
//
// seal_document (2026-08-01, VERIFIED_BADGE_SCOPE.md) is the same shape as
// save_as_template: confirm-only, and also absent from TOOLS below. The
// document_id it acts on only ever exists because the chat UI's own
// "Get a Verified Badge" upload button just created it — never something
// Mistral resolves or guesses from a name.
const CONFIRM_REQUIRED = new Set(["send_document", "bulk_send", "save_as_template", "seal_document"]);

const SYSTEM_PROMPT =
  "You are SignedBy Console, an assistant that sends, tracks, and manages e-signature documents on the user's " +
  "SignedBy account by calling the tools provided. SignedBy does have a referral program — use " +
  "get_referral_link whenever asked about it, rather than saying one doesn't exist. Only take an action the " +
  "user has clearly asked for. Never, " +
  "under any circumstance, invent or guess a template_id or document_id. The user never sees or works with " +
  "raw ids — they refer to things by name, recipient, or recency ('the NDA', 'the one I just sent to jane', " +
  "'this', 'the latest one'), and it's your job to resolve that to the real id yourself, invisibly. You can " +
  "call more than one tool per turn in sequence — e.g. call list_documents first to find which document 'this' " +
  "or 'the latest one' refers to (match on title, recency, or recipient if you can tell from context), THEN " +
  "call check_status or void_document with the real id you found. Never present a raw id to the user unless " +
  "they explicitly ask for it. If you truly can't find a match after looking, say so plainly and ask the user " +
  "for a distinguishing detail — don't guess an id to keep going.\n\n" +
  "Be descriptive in your replies, not terse. After looking something up or taking an action, say clearly what " +
  "you found or did and spell out the details that matter — names, counts, statuses, settings used — rather " +
  "than a bare 'Done' or 'Sent'. A few sentences is fine; this isn't about being wordy, it's about the user " +
  "never having to guess what actually happened.\n\n" +
  "Before sending a document (send_document or bulk_send), briefly ask once whether the user wants an " +
  "expiration date and whether the recipient(s) should have to verify their email with a one-time code before " +
  "signing — but don't block on an answer. If they don't say, proceed with no expiration and no verification " +
  "(the defaults). If they answer inline in the same message as the send request (e.g. 'send it, no " +
  "expiration needed'), don't ask again, just use what they said.\n\n" +
  "For bulk_send, recipients can be pasted in a lot of shapes — one email per line, comma-separated, or " +
  "'email, name' pairs. If a pasted list is genuinely ambiguous (e.g. you can't tell where one entry ends and " +
  "the next begins), ask the user to paste it as one recipient per line, optionally 'email, name'. Don't ask " +
  "this proactively before they've pasted anything — only when what they gave you doesn't parse cleanly.\n\n" +
  "When a reply includes more than one item — a list of documents, a list of templates, a bulk-send " +
  "recipient breakdown, or multiple statuses — format that part as a Unicode box-drawing grid table, not a " +
  "bulleted or numbered list: draw it with ┌ ┬ ┐ │ ├ ┼ ┤ └ ┴ ┘ ─, one row per item, short column headers " +
  "(e.g. Document | Status | Sent), and keep the whole table under about 70 characters wide so it renders " +
  "without wrapping. Pad cell text with spaces so the │ separators line up in straight columns. Put any " +
  "narrative sentence (what you found, what's next) before or after the table, not inside it. A single item " +
  "or a plain narrative answer doesn't need a table — use one only when there are multiple rows worth " +
  "scanning at a glance.";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "send_document",
      description: "Create and send one document from a template to a single signer.",
      parameters: {
        type: "object",
        properties: {
          template_id: { type: "string" },
          signer_email: { type: "string" },
          signer_name: { type: "string" },
          expires_at: {
            type: "string",
            description:
              "Optional. ISO 8601 datetime the document expires at (e.g. 2026-09-30T00:00:00Z). Omit for no expiration.",
          },
          auth_required: {
            type: "boolean",
            description: "Optional. If true, the signer must verify their email with a one-time code before they can sign. Defaults to false.",
          },
          invite_subject: {
            type: "string",
            description: "Optional. Custom subject line for the invite email, up to 200 characters. Omit to use the default.",
          },
          invite_message: {
            type: "string",
            description: "Optional. Custom message body for the invite email, up to 2000 characters. Omit to use the default.",
          },
        },
        required: ["template_id", "signer_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_send",
      description: "Send the same template to a list of recipients, each as their own independent document.",
      parameters: {
        type: "object",
        properties: {
          template_id: { type: "string" },
          recipients: {
            type: "array",
            items: {
              type: "object",
              properties: { email: { type: "string" }, name: { type: "string" } },
              required: ["email"],
            },
          },
          expires_at: {
            type: "string",
            description:
              "Optional. ISO 8601 datetime every document in this batch expires at. Omit for no expiration. Applies to the whole batch, not per recipient.",
          },
          auth_required: {
            type: "boolean",
            description:
              "Optional. If true, every recipient must verify their email with a one-time code before they can sign. Defaults to false. Applies to the whole batch, not per recipient.",
          },
          invite_subject: {
            type: "string",
            description: "Optional. Custom subject line for the invite email, up to 200 characters, same for the whole batch.",
          },
          invite_message: {
            type: "string",
            description: "Optional. Custom message body for the invite email, up to 2000 characters, same for the whole batch.",
          },
        },
        required: ["template_id", "recipients"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_status",
      description: "Check the status and signers of a document by id.",
      parameters: { type: "object", properties: { document_id: { type: "string" } }, required: ["document_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_documents",
      description: "List the org's recent documents, optionally filtered by status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "sent", "completed", "declined", "voided"] },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_templates",
      description: "List the org's templates, to resolve a template name to its id.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "void_document",
      description: "Cancel a document that's out for signature.",
      parameters: { type: "object", properties: { document_id: { type: "string" } }, required: ["document_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_referral_link",
      description:
        "Get the user's SignedBy referral program details: their unique referral link, which reward program " +
        "applies to their current plan, the reward amounts, and their progress so far (including Super Referrer " +
        "status). Use this whenever the user asks about referrals, invites, a referral link, or how to earn " +
        "rewards or credits for referring others — SignedBy does have a referral program.",
      parameters: { type: "object", properties: {} },
    },
  },
] as const;

type MistralToolCall = { id: string; function: { name: string; arguments: string } };
type MistralChoiceMessage = { content: string | null; tool_calls?: MistralToolCall[] };

async function callMistral(messages: readonly unknown[], tools: readonly unknown[]): Promise<MistralChoiceMessage> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured.");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-large-latest",
      max_tokens: 700,
      messages,
      tools,
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Mistral API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: MistralChoiceMessage }[] };
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error("Unexpected response shape from Mistral.");
  return message;
}

type ToolExecutionResult =
  | Awaited<ReturnType<typeof sendDocumentAction>>
  | Awaited<ReturnType<typeof bulkSendAction>>
  | Awaited<ReturnType<typeof checkStatusAction>>
  | Awaited<ReturnType<typeof listDocumentsAction>>
  | Awaited<ReturnType<typeof listTemplatesAction>>
  | Awaited<ReturnType<typeof voidDocumentAction>>
  | Awaited<ReturnType<typeof saveAsTemplateAction>>
  | Awaited<ReturnType<typeof sealDocumentAction>>
  | Awaited<ReturnType<typeof getReferralInfoAction>>
  | { ok: false; error: string; status: number };

async function executeTool(
  orgId: string,
  metered: boolean,
  freeCapped: boolean,
  hasBulkSend: boolean,
  name: string,
  args: Record<string, unknown>
): Promise<ToolExecutionResult> {
  switch (name) {
    case "send_document":
      return sendDocumentAction({
        orgId,
        templateId: String(args.template_id ?? ""),
        signerEmail: String(args.signer_email ?? ""),
        signerName: typeof args.signer_name === "string" ? args.signer_name : null,
        metered,
        freeCapped,
        expiresAt: typeof args.expires_at === "string" ? args.expires_at : null,
        authRequired: args.auth_required === true,
        inviteSubject: typeof args.invite_subject === "string" ? args.invite_subject : null,
        inviteMessage: typeof args.invite_message === "string" ? args.invite_message : null,
      });
    case "bulk_send":
      // Pre-existing gap, fixed 2026-08-19 (FREE_TIER_ONE_TEMPLATE_SCOPE.md
      // decision 3): api/v1/documents/bulk-send/route.ts has always gated
      // this to Team+ before calling bulkSendAction; this console-chat path
      // called straight through with no equivalent check. Checked here,
      // not in bulkSendAction itself, matching how every other plan-feature
      // gate in this codebase lives at the caller rather than the shared
      // action (see save_as_template below and console-actions.ts's own
      // saveAsTemplateAction, which duplicates its own planHasFeature check
      // rather than the caller doing it once centrally).
      if (!hasBulkSend) {
        return { ok: false, error: "Bulk send requires the Team plan or higher.", status: 402 };
      }
      return bulkSendAction({
        orgId,
        templateId: String(args.template_id ?? ""),
        recipients: Array.isArray(args.recipients) ? (args.recipients as { email: string; name?: string }[]) : [],
        metered,
        freeCapped,
        expiresAt: typeof args.expires_at === "string" ? args.expires_at : null,
        authRequired: args.auth_required === true,
        inviteSubject: typeof args.invite_subject === "string" ? args.invite_subject : null,
        inviteMessage: typeof args.invite_message === "string" ? args.invite_message : null,
      });
    case "check_status":
      return checkStatusAction(orgId, String(args.document_id ?? ""));
    case "list_documents":
      return listDocumentsAction(orgId, {
        status: typeof args.status === "string" ? args.status : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });
    case "list_templates":
      return listTemplatesAction(orgId);
    case "void_document":
      return voidDocumentAction(orgId, String(args.document_id ?? ""));
    case "get_referral_link":
      return getReferralInfoAction(orgId);
    case "save_as_template":
      return saveAsTemplateAction({
        orgId,
        documentId: String(args.document_id ?? ""),
        name: String(args.name ?? ""),
        fields: Array.isArray(args.fields) ? args.fields : [],
      });
    case "seal_document": {
      const mode = args.certificate_mode;
      const certificateMode = mode === "separate" || mode === "both" ? mode : "appended";
      const entryPointArg = args.entry_point;
      const entryPoint =
        entryPointArg === "dropzone" || entryPointArg === "seal_button" || entryPointArg === "paperclip" ? entryPointArg : undefined;
      return sealDocumentAction({
        orgId,
        documentId: String(args.document_id ?? ""),
        certificateMode,
        // No `metered` param — sealing's metered branch was retired
        // entirely (2026-08-05, VERIFIED_BADGE_DASHBOARD_SCOPE.md decision
        // 2). `metered` above is still threaded through to send_document/
        // bulk_send, which keep their own metering unchanged.
        source: "console",
        entryPoint,
      });
    }
    default:
      return { ok: false as const, error: `Unknown tool: ${name}`, status: 400 };
  }
}

/** Summarizes expires_at/auth_required/invite_subject/invite_message so
 *  the confirm step always shows what's actually about to happen, not
 *  just who it's going to — a silent default (no expiration, no
 *  verification) is still worth stating explicitly rather than leaving
 *  the user to guess. */
export function describeSendSettings(args: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof args.expires_at === "string" && args.expires_at) {
    const parsed = new Date(args.expires_at);
    parts.push(Number.isNaN(parsed.getTime()) ? "expires (date unclear)" : `expires ${parsed.toLocaleDateString()}`);
  } else {
    parts.push("no expiration");
  }
  parts.push(args.auth_required === true ? "recipient must verify email to sign" : "no email verification required");
  if (typeof args.invite_subject === "string" && args.invite_subject.trim()) parts.push("custom invite subject");
  if (typeof args.invite_message === "string" && args.invite_message.trim()) parts.push("custom invite message");
  return parts.join(", ");
}

export function describeConfirmAction(name: string, args: Record<string, unknown>): string {
  if (name === "send_document") {
    return `Send this template to ${String(args.signer_email ?? "the specified signer")}? (${describeSendSettings(args)})`;
  }
  const count = Array.isArray(args.recipients) ? args.recipients.length : 0;
  return (
    `This will send the template to ${count} recipient${count === 1 ? "" : "s"} as separate documents ` +
    `(${describeSendSettings(args)}). Confirm?`
  );
}

/** Present-tense status phrase for the "what console is doing right now"
 *  narration (onStatus below) — shown as a transient line in the chat
 *  while a tool call or model round-trip is in flight, replaced once the
 *  real reply arrives. Kept separate from describeConfirmAction/
 *  describeSendSettings, which describe what's ABOUT to happen or DID
 *  happen, not what's happening this instant. */
function toolStatusPhrase(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "list_templates":
      return "Looking up your templates…";
    case "list_documents":
      return "Looking up your documents…";
    case "check_status":
      return "Checking that document's status…";
    case "void_document":
      return "Voiding the document…";
    case "send_document":
      return `Sending to ${String(args.signer_email ?? "the signer")}…`;
    case "bulk_send": {
      const count = Array.isArray(args.recipients) ? args.recipients.length : 0;
      return `Sending to ${count} recipient${count === 1 ? "" : "s"}…`;
    }
    case "save_as_template":
      return "Saving as a template…";
    case "seal_document":
      return "Sealing the document…";
    case "get_referral_link":
      return "Looking up your referral program…";
    default:
      return "Working on it…";
  }
}

export type ConsoleChatTurnResult =
  | { type: "message"; content: string }
  | { type: "confirm"; tool: string; arguments: Record<string, unknown>; content: string }
  | { type: "error"; error: string }
  // seal_document's needs-identity-verification failure (2026-08-01,
  // direct bug report: the plain-text "message" version below told
  // someone to go open Settings, but had no actual way to get there — the
  // only nearby clickable thing was the "Get a Verified Badge" attach
  // button itself, which just reopened the file picker again, so
  // following the instruction looked like it silently did nothing).
  // Distinct type so console-chat.tsx can render a real "Open Settings"
  // button wired to onOpenSettings instead of plain prose.
  | { type: "needs_identity"; content: string }
  // seal_document's Free-plan cap-hit failure (2026-08-05, direct
  // instruction — separate 3-seals/month counter, independent of the
  // upload-time cap-hit path new-document-client.tsx and this file's own
  // reportUploadError used to share with it). Distinct type, same reasoning
  // as needs_identity above: console-chat.tsx renders this as the real
  // capReached upsell bubble (Upgrade to Pro / Buy 25 more) instead of
  // plain "Couldn't do that: ..." prose.
  | { type: "capReached"; content: string }
  // seal_document's success case (2026-08-01, direct feedback: the raw
  // verify URL is a full SHA-512 hash — unwieldy to select/copy by hand,
  // and the sealed PDF/certificate/badge were only reachable via a trip to
  // the documents list). Carries the structured pieces console-chat.tsx
  // needs to render a copy-link button and inline download buttons,
  // instead of asking the model or the user to parse them back out of
  // prose.
  | {
      type: "sealed";
      content: string;
      documentId: string;
      verifyUrl: string;
      hasSignedFile: boolean;
      hasCertificateFile: boolean;
    };

/** Runs one turn of the console chat. Two entry shapes: a normal message
 *  turn (Mistral decides whether to call a tool), or a confirmedTool turn
 *  (the user clicked "Confirm" on a previously proposed send_document/
 *  bulk_send — executes directly, no re-inference, so a confirmed send
 *  can never be second-guessed or altered by the model).
 *
 *  `onStatus` (2026-07-31, direct ask: "very descriptive... what it's
 *  doing") fires a present-tense phrase before each slow step (a Mistral
 *  round-trip or a tool execution) — the API route streams these to the
 *  client as they happen, rendered as a transient status line ahead of
 *  the final reply, instead of a plain unlabeled loading state. */
export async function runConsoleChatTurn(params: {
  orgId: string;
  metered: boolean;
  // Free plan (FREE_TEMPLATE_SANDBOX, 2026-08-19) — see sendDocumentAction's
  // doc comment in console-actions.ts. Mutually exclusive with `metered`;
  // the caller (api/console/chat/route.ts) sets exactly one true based on
  // the org's actual plan.
  freeCapped?: boolean;
  // Team+ gate for the bulk_send tool (FREE_TIER_ONE_TEMPLATE_SCOPE.md
  // decision 3, 2026-08-19) — see executeTool's "bulk_send" case. Defaults
  // to false (the safe/blocked side) so a caller that forgets to pass this
  // fails closed rather than silently allowing bulk send.
  hasBulkSend?: boolean;
  messages: ChatMessage[];
  confirmedTool?: { name: string; arguments: Record<string, unknown> };
  onStatus?: (text: string) => void;
}): Promise<ConsoleChatTurnResult> {
  const { orgId, metered, freeCapped = false, hasBulkSend = false, messages, confirmedTool, onStatus } = params;

  if (confirmedTool) {
    if (!CONFIRM_REQUIRED.has(confirmedTool.name)) {
      return { type: "error", error: "That action doesn't require confirmation." };
    }
    onStatus?.(toolStatusPhrase(confirmedTool.name, confirmedTool.arguments));
    const result = await executeTool(orgId, metered, freeCapped, hasBulkSend, confirmedTool.name, confirmedTool.arguments);
    if (!result.ok) {
      // seal_document's one special failure mode: no verified identity on
      // file yet (or it's gone stale) — point at Settings rather than just
      // reporting a generic error, since there's a real next step to take.
      if ("needsIdentityVerification" in result && result.needsIdentityVerification) {
        return {
          type: "needs_identity",
          content: `${result.error} It only takes about a minute, then come back and try sealing again.`,
        };
      }
      if ("upgrade" in result && result.upgrade) {
        return { type: "capReached", content: result.error };
      }
      return { type: "message", content: `Couldn't do that: ${result.error}` };
    }
    if (confirmedTool.name === "send_document" && "documentId" in result) {
      const parts = [
        `Sent the document to ${String(confirmedTool.arguments.signer_email ?? "the signer")}.`,
        `${capitalize(describeSendSettings(confirmedTool.arguments))}.`,
      ];
      if ("domainWarning" in result && result.domainWarning) parts.push(`Heads up — ${result.domainWarning}`);
      parts.push(`Document id: ${result.documentId}.`);
      return { type: "message", content: parts.join(" ") };
    }
    if (confirmedTool.name === "bulk_send" && "sent" in result) {
      const capSkipped = result.skippedCapReached.length;
      const timeoutSkipped = result.skippedTimeoutReached.length;
      const parts = [
        `Sent to ${result.sent.length} recipient${result.sent.length === 1 ? "" : "s"} as separate documents.`,
        `${capitalize(describeSendSettings(confirmedTool.arguments))}.`,
      ];
      if (capSkipped > 0) parts.push(`Stopped early — the console spend cap was reached, ${capSkipped} recipient(s) not sent.`);
      let content = parts.join(" ");
      // Timeout stop (2026-07-31, see CONSOLE_BULK_SEND_TIMEOUT_SCOPE.md) —
      // unlike the cap stop above, this isn't a hard wall the user has to
      // wait out, so it gets its own paragraph plus the actual remaining
      // emails (not just a count) — a follow-up "continue" message then has
      // everything needed, straight from this turn's own history, to
      // re-issue bulk_send with exactly who's left.
      if (timeoutSkipped > 0) {
        const list = result.skippedTimeoutReached.map((email) => `- ${email}`).join("\n");
        content += `\n\nStopped early to stay within one request's time limit — ${timeoutSkipped} recipient(s) not sent yet. Just say "continue" and I'll send to the rest:\n\n${list}`;
      }
      return { type: "message", content };
    }
    if (confirmedTool.name === "save_as_template" && "templateId" in result) {
      const name = String(confirmedTool.arguments.name ?? "this template");
      return {
        type: "message",
        content: `Saved as a template called "${name}." Send it any time by name — e.g. "send ${name} to jane@acme.com."`,
      };
    }
    if (confirmedTool.name === "seal_document" && "verifyUrl" in result) {
      return {
        type: "sealed",
        content: "Sealed. Anyone can verify it, no account needed — copy the link or grab the files below.",
        documentId: result.documentId,
        verifyUrl: result.verifyUrl,
        hasSignedFile: result.hasSignedFile,
        hasCertificateFile: result.hasCertificateFile,
      };
    }
    return { type: "message", content: "Done." };
  }

  if (messages.length === 0) return { type: "error", error: "No message provided." };

  let wireMessages: unknown[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Bounded tool-calling loop (2026-07-31) — previously this was exactly
  // two Mistral calls: one to decide on a tool, one to turn that tool's
  // result into text, full stop. That meant a question like "was it
  // signed?" — where the model needs to call list_documents to find WHICH
  // document, then check_status on the real id it found — physically
  // couldn't be answered in one turn: the model would either invent an id
  // (observed live) or its second call's own follow-up tool_calls got
  // silently discarded, since the old code only ever read `second.content`.
  // Looping (capped so a confused model can't run up API cost/turn latency
  // forever) lets it chain list_documents → check_status, or
  // list_templates → send_document's confirm step, etc., the way the
  // system prompt's "reconcile a name to an id yourself" instruction
  // actually requires.
  const MAX_TOOL_STEPS = 4;
  onStatus?.("Thinking…");
  let call = await callMistral(wireMessages, TOOLS);

  for (let step = 0; ; step++) {
    const toolCall = call.tool_calls?.[0];

    if (!toolCall) {
      // Mistral occasionally returns neither a tool call nor any text on a
      // turn (observed 2026-07-30) — a friendly fallback beats a blank bubble.
      return { type: "message", content: call.content?.trim() || "Sorry, I didn't catch that — could you rephrase?" };
    }

    const name = toolCall.function.name;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      return { type: "error", error: "Couldn't parse the requested action." };
    }

    if (CONFIRM_REQUIRED.has(name)) {
      return { type: "confirm", tool: name, arguments: args, content: describeConfirmAction(name, args) };
    }

    if (step >= MAX_TOOL_STEPS) {
      return {
        type: "message",
        content: "That took more lookups than expected — try again with a bit more detail, like which document or recipient you mean.",
      };
    }

    // Read-only tool: execute, feed the result back, and see whether Mistral
    // is ready to answer in text or wants to chain into another tool call.
    onStatus?.(toolStatusPhrase(name, args));
    const result = await executeTool(orgId, metered, freeCapped, hasBulkSend, name, args);
    const toolResultText = JSON.stringify(result);

    wireMessages = [
      ...wireMessages,
      // Mistral rejects `content: null` on a tool-call assistant message —
      // "Assistant message must have either content or tool_calls, but not
      // none" (observed live 2026-07-31: a read-only lookup like
      // list_templates triggered this path and 400'd). Empty string reads
      // as "has content" to their validator; null doesn't, even with
      // tool_calls present.
      { role: "assistant", content: "", tool_calls: [toolCall] },
      { role: "tool", tool_call_id: toolCall.id, name, content: toolResultText },
    ];

    onStatus?.("Putting together a reply…");
    call = await callMistral(wireMessages, TOOLS);
  }
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}
