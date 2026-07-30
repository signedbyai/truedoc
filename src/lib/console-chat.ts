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
  "the right id from earlier in the conversation. Keep replies short and concrete.";

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
      });
    case "bulk_send":
      return bulkSendAction({
        orgId,
        templateId: String(args.template_id ?? ""),
        recipients: Array.isArray(args.recipients) ? (args.recipients as { email: string; name?: string }[]) : [],
        metered,
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

function describeConfirmAction(name: string, args: Record<string, unknown>): string {
  if (name === "send_document") {
    return `Send this template to ${String(args.signer_email ?? "the specified signer")}?`;
  }
  const count = Array.isArray(args.recipients) ? args.recipients.length : 0;
  return `This will send the template to ${count} recipient${count === 1 ? "" : "s"} as separate documents. Confirm?`;
}

export type ConsoleChatTurnResult =
  | { type: "message"; content: string }
  | { type: "confirm"; tool: string; arguments: Record<string, unknown>; content: string }
  | { type: "error"; error: string };

/** Runs one turn of the console chat. Two entry shapes: a normal message
 *  turn (Mistral decides whether to call a tool), or a confirmedTool turn
 *  (the user clicked "Confirm" on a previously proposed send_document/
 *  bulk_send — executes directly, no re-inference, so a confirmed send
 *  can never be second-guessed or altered by the model). */
export async function runConsoleChatTurn(params: {
  orgId: string;
  metered: boolean;
  messages: ChatMessage[];
  confirmedTool?: { name: string; arguments: Record<string, unknown> };
}): Promise<ConsoleChatTurnResult> {
  const { orgId, metered, messages, confirmedTool } = params;

  if (confirmedTool) {
    if (!CONFIRM_REQUIRED.has(confirmedTool.name)) {
      return { type: "error", error: "That action doesn't require confirmation." };
    }
    const result = await executeTool(orgId, metered, confirmedTool.name, confirmedTool.arguments);
    if (!result.ok) return { type: "message", content: `Couldn't do that: ${result.error}` };
    if (confirmedTool.name === "send_document" && "documentId" in result) {
      return { type: "message", content: `Sent. Document id: ${result.documentId}.` };
    }
    if (confirmedTool.name === "bulk_send" && "sent" in result) {
      const skipped = result.skippedCapReached.length;
      return {
        type: "message",
        content:
          `Sent to ${result.sent.length} recipient${result.sent.length === 1 ? "" : "s"}.` +
          (skipped > 0 ? ` Stopped early — the console spend cap was reached, ${skipped} recipient(s) not sent.` : ""),
      };
    }
    return { type: "message", content: "Done." };
  }

  if (messages.length === 0) return { type: "error", error: "No message provided." };

  const wireMessages: unknown[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

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
  // the raw result into a short natural-language reply.
  const result = await executeTool(orgId, metered, name, args);
  const toolResultText = JSON.stringify(result);

  const second = await callMistral(
    [
      ...wireMessages,
      { role: "assistant", content: null, tool_calls: [toolCall] },
      { role: "tool", tool_call_id: toolCall.id, name, content: toolResultText },
    ],
    TOOLS
  );

  return { type: "message", content: second.content ?? toolResultText };
}
