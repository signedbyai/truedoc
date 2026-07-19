import { describe, expect, it } from "vitest";
import { QUIZ_SHARE_SOURCE, quizShareText, quizShareUrl } from "./quiz-share";

describe("quizShareUrl", () => {
  it("points at the quiz, not the homepage", () => {
    // The share is an invitation to take the quiz. Dropping someone on the
    // homepage instead loses the thing that made them curious.
    expect(quizShareUrl()).toContain("signedby.ai/quiz");
  });

  it("is tagged so shared traffic is distinguishable from paid and direct", () => {
    // Without this the whole "see whether the viral loop works" question is
    // unanswerable — shared visitors would look exactly like direct ones.
    const url = quizShareUrl();
    expect(url).toContain(`utm_source=${QUIZ_SHARE_SOURCE}`);
    expect(url).toContain("utm_medium=social");
    expect(url).toContain("utm_campaign=signature-quiz");
  });

  it("does not reuse the paid campaign's source", () => {
    // utm_source=linkedin is the ad. If shares carried it too, paid and organic
    // would be summed together and the campaign would look better than it is.
    expect(quizShareUrl()).not.toContain("utm_source=linkedin");
  });
});

describe("quizShareText", () => {
  it("carries the link in the text body", () => {
    // navigator.share's `url` field is dropped by several platforms when a file
    // is attached, which is always the case here. Putting it in the text is
    // what guarantees it survives.
    const text = quizShareText("You sign like nobody's watching.");
    expect(text).toContain("You sign like nobody's watching.");
    expect(text).toContain(quizShareUrl());
  });

  it("separates the tagline from the link so neither runs into the other", () => {
    const text = quizShareText("Deliberate, unhurried.");
    expect(text).toMatch(/Deliberate, unhurried\.\n\nhttps:/);
  });
});
