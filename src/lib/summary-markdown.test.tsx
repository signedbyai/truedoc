import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { parseInline, SummaryMarkdown } from "./summary-markdown";

// parseInline returns React nodes; render them to a string to assert.
function inlineHtml(text: string): string {
  return renderToStaticMarkup(<>{parseInline(text)}</>);
}

describe("parseInline", () => {
  it("renders **bold** as <strong>, not literal asterisks", () => {
    const html = inlineHtml("You are agreeing to **pay $2,000** on signing.");
    expect(html).toContain("<strong>pay $2,000</strong>");
    expect(html).not.toContain("**");
  });

  it("renders *italic* and _italic_ as <em>", () => {
    expect(inlineHtml("this is *important*")).toContain("<em>important</em>");
    expect(inlineHtml("this is _important_")).toContain("<em>important</em>");
  });

  it("leaves plain text untouched", () => {
    expect(inlineHtml("just a normal sentence")).toBe("just a normal sentence");
  });

  it("does not treat a lone asterisk or math as emphasis", () => {
    const html = inlineHtml("2 * 3 = 6 and a * b");
    expect(html).not.toContain("<em>");
  });
});

describe("SummaryMarkdown", () => {
  it("turns a markdown bullet list into <ul><li>", () => {
    const html = renderToStaticMarkup(<SummaryMarkdown text={"Key points:\n- First term\n- Second term"} />);
    expect(html).toContain("<ul");
    expect(html).toContain("<li>First term</li>");
    expect(html).toContain("<li>Second term</li>");
    expect(html).not.toContain("- First term");
  });

  it("renders paragraphs separated by blank lines", () => {
    const html = renderToStaticMarkup(<SummaryMarkdown text={"First para.\n\nSecond para."} />);
    expect((html.match(/<p/g) || []).length).toBe(2);
  });

  it("never emits raw asterisks from bold emphasis", () => {
    const html = renderToStaticMarkup(<SummaryMarkdown text={"This is a **binding** agreement."} />);
    expect(html).toContain("<strong>binding</strong>");
    expect(html).not.toContain("**");
  });
});
