import { describe, expect, it } from "vitest";
import {
  BADGES,
  EMPTY_COUNTS,
  MIN_RESOLVED_FOR_RATE,
  tallyStatuses,
  workspaceStats,
} from "./workspace-stats";

describe("workspaceStats", () => {
  it("counts a document as sent once it has left draft, in any later state", () => {
    // The point of the badge is finishing the job, so a draft must never count
    // — otherwise someone uploads ten files they never send and gets a badge.
    const s = workspaceStats({ draft: 7, sent: 2, completed: 3, declined: 1, voided: 1 });
    expect(s.sent).toBe(7);
    expect(s.signed).toBe(3);
  });

  it("excludes in-flight documents from the completion rate", () => {
    // A document out for signature isn't a loss yet. Counting it against the
    // rate would mean the number drops every time you send something, which
    // would punish exactly the behaviour the card is meant to encourage.
    const s = workspaceStats({ draft: 0, sent: 50, completed: 4, declined: 0, voided: 0 });
    expect(s.resolved).toBe(4);
    expect(s.completionRate).toBe(100);
  });

  it("hides the completion rate until it can mean something", () => {
    const one = workspaceStats({ draft: 0, sent: 0, completed: 1, declined: 0, voided: 0 });
    expect(one.completionRate).toBeNull();

    const enough = workspaceStats({
      draft: 0,
      sent: 0,
      completed: MIN_RESOLVED_FOR_RATE,
      declined: 0,
      voided: 0,
    });
    expect(enough.completionRate).toBe(100);
  });

  it("counts declined and voided against the rate but completed toward it", () => {
    const s = workspaceStats({ draft: 0, sent: 0, completed: 3, declined: 1, voided: 0 });
    expect(s.resolved).toBe(4);
    expect(s.completionRate).toBe(75);
  });

  it("gives a brand new workspace no badge and points it at the first one", () => {
    // The empty state depends on this: no earned badge means the card renders
    // a prompt rather than a row of zeroes and a greyed-out hat.
    const s = workspaceStats(EMPTY_COUNTS);
    expect(s.earned).toBeNull();
    expect(s.next?.id).toBe("first-send");
    expect(s.completionRate).toBeNull();
  });

  it("awards the highest threshold cleared, not the first", () => {
    const s = workspaceStats({ draft: 0, sent: 0, completed: 62, declined: 0, voided: 0 });
    expect(s.earned?.id).toBe("signing-wizard");
    expect(s.next?.id).toBe("paperwork-slayer");
  });

  it("has no next badge at the top of the ladder", () => {
    const s = workspaceStats({ draft: 0, sent: 0, completed: 500, declined: 0, voided: 0 });
    expect(s.earned?.id).toBe("paperwork-slayer");
    expect(s.next).toBeNull();
  });

  it("never regresses a badge as more documents are sent", () => {
    // Badges are meant to be unlosable — that's the whole reason the ladder is
    // volume-based rather than rate-based.
    let previous = -1;
    for (let n = 0; n <= 120; n++) {
      const { earned } = workspaceStats({ draft: 0, sent: n, completed: 0, declined: 0, voided: 0 });
      const rank = earned ? BADGES.findIndex((b) => b.id === earned.id) : -1;
      expect(rank).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
  });
});

describe("tallyStatuses", () => {
  it("ignores unknown statuses rather than throwing", () => {
    // A status added to the DB before this file knows about it should not blank
    // out someone's dashboard.
    const counts = tallyStatuses(["draft", "completed", "expired", "completed"]);
    expect(counts.completed).toBe(2);
    expect(counts.draft).toBe(1);
  });

  it("returns all-zero counts for an empty list", () => {
    expect(tallyStatuses([])).toEqual(EMPTY_COUNTS);
  });
});
