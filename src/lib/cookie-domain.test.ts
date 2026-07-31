import { describe, expect, it } from "vitest";
import { cookieDomainFor, clearStaleHostOnlyCookies } from "./cookie-domain";

describe("cookieDomainFor", () => {
  it("widens the domain on the bare apex host", () => {
    expect(cookieDomainFor("signedby.ai")).toBe(".signedby.ai");
  });

  it("widens the domain on any subdomain", () => {
    expect(cookieDomainFor("console.signedby.ai")).toBe(".signedby.ai");
    expect(cookieDomainFor("dev.signedby.ai")).toBe(".signedby.ai");
  });

  it("strips a port before matching", () => {
    expect(cookieDomainFor("signedby.ai:3000")).toBe(".signedby.ai");
  });

  it("leaves localhost and preview hosts untouched", () => {
    expect(cookieDomainFor("localhost:3000")).toBeUndefined();
    expect(cookieDomainFor("signedby-abc123.vercel.app")).toBeUndefined();
  });

  it("handles a missing host", () => {
    expect(cookieDomainFor(null)).toBeUndefined();
    expect(cookieDomainFor(undefined)).toBeUndefined();
  });
});

describe("clearStaleHostOnlyCookies", () => {
  it("appends a host-only, immediately-expired Set-Cookie for each name, without a Domain attribute", () => {
    const headers = new Headers();
    clearStaleHostOnlyCookies(
      { headers },
      [
        { name: "sb-abc-auth-token.0", options: { path: "/", httpOnly: true, secure: true, sameSite: "lax" } },
        { name: "sb-abc-auth-token.1", options: { path: "/", httpOnly: true, secure: true, sameSite: "lax" } },
      ]
    );

    const setCookies = headers.getSetCookie();
    expect(setCookies).toHaveLength(2);
    for (const cookie of setCookies) {
      expect(cookie).toMatch(/^sb-abc-auth-token\.\d=;/);
      expect(cookie).toContain("Max-Age=0");
      expect(cookie).not.toContain("Domain=");
    }
  });

  it("coexists with (doesn't overwrite) a prior real cookie of the same name set via a separate header value", () => {
    // Simulates the real call order: response.cookies.set(...) for the new
    // domain-wide cookie happens first (via a different code path), THEN
    // clearStaleHostOnlyCookies appends its own directive afterward — both
    // must show up as distinct Set-Cookie entries for the browser to both
    // store the new cookie and expire the old one.
    const headers = new Headers();
    headers.append("set-cookie", "sb-abc-auth-token.0=NEWVALUE; Path=/; Domain=.signedby.ai; Secure; HttpOnly; SameSite=lax");

    clearStaleHostOnlyCookies({ headers }, [{ name: "sb-abc-auth-token.0", options: { path: "/", httpOnly: true, secure: true, sameSite: "lax" } }]);

    const setCookies = headers.getSetCookie();
    expect(setCookies).toHaveLength(2);
    expect(setCookies[0]).toContain("Domain=.signedby.ai");
    expect(setCookies[1]).not.toContain("Domain=");
  });

  it("defaults path to / when the source cookie didn't specify one", () => {
    const headers = new Headers();
    clearStaleHostOnlyCookies({ headers }, [{ name: "sb-abc-auth-token.0", options: {} }]);
    expect(headers.getSetCookie()[0]).toContain("Path=/");
  });
});
