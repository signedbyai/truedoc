import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { withTimeout, TimeoutError } from "./with-timeout";

// This is the actual "slow connection" test: a promise that never settles
// (exactly what a stalled R2 read or a stalled pdf.js fetch on a bad mobile
// connection looks like — not an outright error, just silence) must still
// fail after a bound, and must call the cleanup hook so the caller can
// cancel the abandoned attempt. Uses fake timers since we're testing the
// timeout *mechanism* itself, not a real network delay.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withTimeout", () => {
  it("resolves with the promise's value when it settles before the timeout", async () => {
    const fast = Promise.resolve("done");
    const result = await withTimeout(fast, 5000);
    expect(result).toBe("done");
  });

  it("rejects with whatever the promise rejects with, if that happens before the timeout", async () => {
    const failing = Promise.reject(new Error("network blip"));
    await expect(withTimeout(failing, 5000)).rejects.toThrow("network blip");
  });

  it("rejects with a TimeoutError once the timeout elapses on a promise that never settles", async () => {
    const hangsForever = new Promise<string>(() => {});
    const onTimeout = vi.fn();
    const pending = withTimeout(hangsForever, 5000, onTimeout);
    // Attach a rejection handler before advancing timers, so Node doesn't
    // flag this as an unhandled rejection while the fake clock ticks.
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not fire the timeout if the promise settles just before it elapses", async () => {
    let resolveIt: (v: string) => void;
    const almostHangs = new Promise<string>((resolve) => {
      resolveIt = resolve;
    });
    const onTimeout = vi.fn();
    const pending = withTimeout(almostHangs, 5000, onTimeout);
    await vi.advanceTimersByTimeAsync(4000);
    resolveIt!("just in time");
    const result = await pending;
    expect(result).toBe("just in time");
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("safely absorbs a late rejection from the original promise after the timeout already won", async () => {
    let rejectIt: (err: Error) => void;
    const eventuallyRejects = new Promise<string>((_resolve, reject) => {
      rejectIt = reject;
    });
    const pending = withTimeout(eventuallyRejects, 1000);
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    // The original promise finally settles well after the race is over —
    // this must not throw an unhandled rejection anywhere.
    rejectIt!(new Error("too late, nobody's listening"));
  });
});
