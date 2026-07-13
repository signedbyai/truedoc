import { describe, expect, it } from "vitest";
import {
  scoreQuiz,
  ARCHETYPES,
  ARCHETYPE_ORDER,
  QUIZ_QUESTIONS,
  type ArchetypeId,
} from "./signature-quiz";
import { SIGNATURE_STYLES } from "./signature-styles";

describe("scoreQuiz", () => {
  it("picks the archetype with the most answers", () => {
    const answers: ArchetypeId[] = [
      "old-money",
      "old-money",
      "old-money",
      "free-spirit",
      "free-spirit",
      "efficient-executive",
      "traditionalist",
      "old-money",
    ];
    expect(scoreQuiz(answers)).toBe("old-money");
  });

  it("breaks ties using ARCHETYPE_ORDER (earlier wins)", () => {
    // Two-way tie between free-spirit and traditionalist, both order 1st/4th.
    const answers: ArchetypeId[] = ["free-spirit", "traditionalist"];
    expect(scoreQuiz(answers)).toBe("free-spirit");

    // Tie between old-money and efficient-executive -- old-money is earlier
    // in ARCHETYPE_ORDER, so it should win even though it appears second.
    const answers2: ArchetypeId[] = ["efficient-executive", "old-money"];
    expect(scoreQuiz(answers2)).toBe("old-money");
  });

  it("handles a single answer", () => {
    expect(scoreQuiz(["traditionalist"])).toBe("traditionalist");
  });

  it("handles an all-tied four-way split by picking the first in ARCHETYPE_ORDER", () => {
    const answers: ArchetypeId[] = ["traditionalist", "efficient-executive", "old-money", "free-spirit"];
    expect(scoreQuiz(answers)).toBe(ARCHETYPE_ORDER[0]);
  });

  it("returns a sensible default for an empty answer set", () => {
    expect(scoreQuiz([])).toBe(ARCHETYPE_ORDER[0]);
  });
});

describe("quiz content integrity", () => {
  it("has 8 questions", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(8);
  });

  it("gives every question exactly one option per archetype, in ARCHETYPE_ORDER", () => {
    for (const question of QUIZ_QUESTIONS) {
      expect(question.options).toHaveLength(ARCHETYPE_ORDER.length);
      expect(question.options.map((o) => o.archetype)).toEqual(ARCHETYPE_ORDER);
    }
  });

  it("gives every archetype a styleId that actually exists in SIGNATURE_STYLES", () => {
    const validIds = new Set(SIGNATURE_STYLES.map((s) => s.id));
    for (const archetype of Object.values(ARCHETYPES)) {
      expect(validIds.has(archetype.styleId)).toBe(true);
    }
  });

  it("maps every archetype to a distinct signature style (no two personas look identical)", () => {
    const styleIds = Object.values(ARCHETYPES).map((a) => a.styleId);
    expect(new Set(styleIds).size).toBe(styleIds.length);
  });

  it("defines exactly the archetypes listed in ARCHETYPE_ORDER, no more, no less", () => {
    expect(Object.keys(ARCHETYPES).sort()).toEqual([...ARCHETYPE_ORDER].sort());
  });
});
