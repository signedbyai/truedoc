import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Regression test for the retry-with-backoff added to getFromR2() (see
// DOCUMENT_DELIVERY_SECURITY_AUDIT.md, Finding 3): R2 is documented to
// return intermittent 5xx errors under concurrent load, and the route
// previously made exactly one GetObjectCommand attempt before surfacing a
// hard failure to the signer. Mocks the S3 client's send() to fail a
// configurable number of times before succeeding (or to always fail with a
// genuine "not found" error) and asserts getFromR2() retries transient
// failures but doesn't waste retries on a real missing object.

const send = vi.fn();

// Arrow functions can't be called with `new` — r2.ts instantiates all of
// these with `new` (`new S3Client(...)`, `new GetObjectCommand(...)`, etc.),
// so every mock needs to be a real constructor function. Returning an
// object literal from a regular function still overrides `this` when
// called with `new`.
function commandMock(input: unknown) {
  return { input };
}

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(function S3ClientMock() {
    return { send };
  }),
  GetObjectCommand: vi.fn(commandMock),
  PutObjectCommand: vi.fn(commandMock),
  DeleteObjectCommand: vi.fn(commandMock),
  CopyObjectCommand: vi.fn(commandMock),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async () => "https://example.com/presigned"),
}));

function fakeBody(text: string) {
  return { transformToByteArray: async () => new TextEncoder().encode(text) };
}

beforeEach(() => {
  send.mockReset();
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = "acct";
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "key";
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "secret";
  process.env.CLOUDFLARE_R2_BUCKET_NAME = "bucket";
});

describe("getFromR2 retry behavior", () => {
  it("succeeds on the first try when R2 is healthy", async () => {
    send.mockResolvedValueOnce({ Body: fakeBody("hello"), ContentType: "application/pdf" });
    const { getFromR2 } = await import("./r2");
    const result = await getFromR2("some/key.pdf");
    expect(result.body.toString()).toBe("hello");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("retries a transient failure and succeeds on the second attempt", async () => {
    send
      .mockRejectedValueOnce(Object.assign(new Error("InternalError"), { name: "InternalError" }))
      .mockResolvedValueOnce({ Body: fakeBody("recovered"), ContentType: "application/pdf" });
    const { getFromR2 } = await import("./r2");
    const result = await getFromR2("some/key.pdf");
    expect(result.body.toString()).toBe("recovered");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("gives up after repeated transient failures instead of retrying forever", async () => {
    send.mockRejectedValue(Object.assign(new Error("InternalError"), { name: "InternalError" }));
    const { getFromR2 } = await import("./r2");
    await expect(getFromR2("some/key.pdf")).rejects.toThrow("InternalError");
    // 3 total attempts (1 initial + 2 retries), not more.
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("does not retry a genuine NoSuchKey — a missing object won't start existing on attempt 2", async () => {
    send.mockRejectedValue(Object.assign(new Error("The specified key does not exist."), { name: "NoSuchKey" }));
    const { getFromR2 } = await import("./r2");
    await expect(getFromR2("missing/key.pdf")).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

// The "slow connection" scenario, as opposed to the "R2 errors outright"
// scenarios above: send() never rejects at all, it just never resolves —
// what a stalled read looks like on the wire. Without the read timeout this
// would hang the whole request indefinitely (see with-timeout.test.ts for
// the timeout mechanism itself, tested in isolation).
describe("getFromR2 on a slow/stalled connection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("times out a hung first attempt, retries, and succeeds once R2 responds", async () => {
    let callCount = 0;
    send.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return new Promise(() => {}); // hangs forever
      return Promise.resolve({ Body: fakeBody("recovered after a stall"), ContentType: "application/pdf" });
    });
    const { getFromR2 } = await import("./r2");
    const pending = getFromR2("some/key.pdf");
    // 8s read timeout on the hung first attempt, plus the backoff before
    // attempt 2 (which then resolves immediately).
    await vi.advanceTimersByTimeAsync(8000 + 200);
    const result = await pending;
    expect(result.body.toString()).toBe("recovered after a stall");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("gives up within bounded time if R2 hangs on every attempt", async () => {
    send.mockImplementation(() => new Promise(() => {}));
    const { getFromR2 } = await import("./r2");
    const pending = getFromR2("some/key.pdf");
    const assertion = expect(pending).rejects.toThrow("Timed out");
    // 3 attempts of an 8s read timeout each, plus backoff between them —
    // this is the actual worst-case bound this fix guarantees, instead of
    // the previous "hangs until Vercel's own platform timeout kills it."
    await vi.advanceTimersByTimeAsync(8000 + 200 + 8000 + 400 + 8000);
    await assertion;
    expect(send).toHaveBeenCalledTimes(3);
  });
});
