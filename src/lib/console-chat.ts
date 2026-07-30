import {
  sendDocumentAction,
  bulkSendAction,
  checkStatusAction,
  listDocumentsAction,
  listTemplatesAction,
  voidDocumentAction,
} from "@/lib/console-actions";

// The console chat's Mistral function-calling loop (CONSOLE_UX_SCOPE.md #2).
// Deliberately its own module rather than an extension of ai-provider.ts's
// generateAIText — that function is a single-turn, no-tools, plain-text
// abstraction shared by field-suggestion/drafting/summarization, and this
// needs multi-turn history plus tool calling, a different enough shape that
// bolting it on risked regressing those stable call sites. Mistral-only for
// v1 (BYOK is an explicit phase-2 fast-follow, not built here).

export type ChatMessage = { role: "user" | "assistant"; content: string };

const CONFIRM_REQUIRED = new Set(["send_document", "bulk_send"]);

const SYSTEM_PROMPT =
  "You are SignedBy Console, an assistant that sends, tracks, and manages e-signature documents on the user's " +
  "SignedBy account by calling the tools provided. Only take an action the user has clearly asked for. Never " +
  "invent a template_id or document_id — call list_templates or list_documents first if you don't already have " +
  "the right id from earlier in the conversation.\n\n" +
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
  "this proactively before they've pasted anything — only when what they gave you doesn't parse cleanly.";

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
  | { ok: false; error: string; status: number };

async function executeTool(orgId: string, metered: boolean, name: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
  switch (name) {
    case "send_document":
      return sendDocumentAction({
        orgId,
        templateId: String(args.template_id ?? ""),
        signerEmail: String(args.signer_email ?? ""),
        signerName: typeof args.signer_name === "string" ? args.signer_name : null,
        metered,
        expiresAt: typeof args.expires_at === "string" ? args.expires_at : null,
        authRequired: args.auth_required === true,
        inviteSubject: typeof args.invite_subject === "string" ? args.invite_subject : null,
        inviteMessage: typeof args.invite_message === "string" ? args.invite_message : null,
      });
    case "bulk_send":
      return bulkSendAction({
        orgId,
        templateId: String(args.template_id ?? ""),
        recipients: Array.isArray(args.recipients) ? (args.recipients as { email: string; name?: string }[]) : [],
        metered,
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
    default:
      return "Working on it…";
  }
}

export type ConsoleChatTurnResult =
  | { type: "message"; content: string }
  | { type: "confirm"; tool: string; arguments: Record<string, unknown>; content: string }
  | { type: "error"; error: string };

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
  messages: ChatMessage[];
  confirmedTool?: { name: string; arguments: Record<string, unknown> };
  onStatus?: (text: string) => void;
}): Promise<ConsoleChatTurnResult> {
  const { orgId, metered, messages, confirmedTool, onStatus } = params;

  if (confirmedTool) {
    if (!CONFIRM_REQUIRED.has(confirmedTool.name)) {
      return { type: "error", error: "That action doesn't require confirmation." };
    }
    onStatus?.(toolStatusPhrase(confirmedTool.name, confirmedTool.arguments));
    const result = await executeTool(orgId, metered, confirmedTool.name, confirmedTool.arguments);
    if (!result.ok) return { type: "message", content: `Couldn't do that: ${result.error}` };
    if (confirmedTool.name === "send_document" && "documentId" in result) {
      const parts = [
        `Sent the document to ${String(confirmedTool.arguments.signer_email ?? "the signer")}.`,
        `${capitalize(describeSendSettings(confirmedTool.arguments))}.`,
      ];
      if (result.domainWarning) parts.push(`Heads up — ${result.domainWarning}`);
      parts.push(`Document id: ${result.documentId}.`);
      return { type: "message", content: parts.join(" ") };
    }
    if (confirmedTool.name === "bulk_send" && "sent" in result) {
      const skipped = result.skippedCapReached.length;
      const parts = [
        `Sent to ${result.sent.length} recipient${result.sent.length === 1 ? "" : "s"} as separate documents.`,
        `${capitalize(describeSendSettings(confirmedTool.arguments))}.`,
      ];
      if (skipped > 0) parts.push(`Stopped early — the console spend cap was reached, ${skipped} recipient(s) not sent.`);
      return { type: "message", content: parts.join(" ") };
    }
    return { type: "message", content: "Done." };
  }

  if (messages.length === 0) return { type: "error", error: "No message provided." };

  const wireMessages: unknown[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  onStatus?.("Thinking…");
  const first = await callMistral(wireMessages, TOOLS);
  const toolCall = first.tool_calls?.[0];

  if (!toolCall) {
    // Mistral occasionally returns neither a tool call nor any text on a
    // turn (observed 2026-07-30) — a friendly fallback beats a blank bubble.
    return { type: "message", content: first.content?.trim() || "Sorry, I didn't catch that — could you rephrase?" };
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

  // Read-only tools execute immediately, then a second Mistral call turns
  // the raw result into a natural-language reply.
  onStatus?.(toolStatusPhrase(name, args));
  const result = await executeTool(orgId, metered, name, args);
  const toolResultText = JSON.stringify(result);

  onStatus?.("Putting together a reply…");
  const second = await callMistral(
    [
      ...wireMessages,
      // Mistral rejects `content: null` on a tool-call assistant message —
      // "Assistant message must have either content or tool_calls, but not
      // none" (observed live 2026-07-31: a read-only lookup like
      // list_templates triggered this path and 400'd). Empty string reads
      // as "has content" to their validator; null doesn't, even with
      // tool_calls present.
      { role: "assistant", content: "", tool_calls: [toolCall] },
      { role: "tool", tool_call_id: toolCall.id, name, content: toolResultText },
    ],
    TOOLS
  );

  return { type: "message", content: second.content ?? toolResultText };
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}
