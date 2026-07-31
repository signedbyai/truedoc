import { describe, expect, it } from "vitest";
import { deriveConversationTitle, type ConsoleConversationMessage } from "./console-conversations";

describe("deriveConversationTitle", () => {
  it("returns 'New chat' when there's no user message yet", () => {
    expect(deriveConversationTitle([])).toBe("New chat");
    expect(deriveConversationTitle([{ role: "assistant", content: "Hi there" }])).toBe("New chat");
  });

  it("uses the first user message as the title", () => {
    const messages: ConsoleConversationMessage[] = [
      { role: "user", content: "send the NDA to jane@acme.com" },
      { role: "assistant", content: "Sure, on it." },
    ];
    expect(deriveConversationTitle(messages)).toBe("send the NDA to jane@acme.com");
  });

  it("ignores an assistant message that comes before the first user message", () => {
    const messages: ConsoleConversationMessage[] = [
      { role: "assistant", content: "How can I help?" },
      { role: "user", content: "what templates do i have" },
    ];
    expect(deriveConversationTitle(messages)).toBe("what templates do i have");
  });

  it("collapses newlines and extra whitespace (e.g. a pasted bulk-send list)", () => {
    const messages: ConsoleConversationMessage[] = [{ role: "user", content: "Here's a list:\n\njane@acme.com\njohn@acme.com" }];
    expect(deriveConversationTitle(messages)).toBe("Here's a list: jane@acme.com john@acme.com");
  });

  it("truncates a long first message with an ellipsis", () => {
    const long = "a".repeat(100);
    const title = deriveConversationTitle([{ role: "user", content: long }]);
    expect(title.length).toBe(61); // 60 chars + "…"
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back to 'New chat' when the first user message is empty/whitespace-only", () => {
    expect(deriveConversationTitle([{ role: "user", content: "   " }])).toBe("New chat");
  });
});
