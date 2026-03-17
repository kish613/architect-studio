import { SignJWT } from "jose";
import { getSessionFromCookies, verifySession } from "../auth.js";

const TEST_SECRET = "test-secret-for-vitest";
const secret = new TextEncoder().encode(TEST_SECRET);

describe("getSessionFromCookies", () => {
  it("returns null for null input", () => {
    expect(getSessionFromCookies(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getSessionFromCookies("")).toBeNull();
  });

  it("returns null when no auth_session cookie present", () => {
    expect(getSessionFromCookies("foo=bar; baz=qux")).toBeNull();
  });

  it("extracts token from a single auth_session cookie", () => {
    expect(getSessionFromCookies("auth_session=abc123")).toBe("abc123");
  });

  it("extracts token from a multi-cookie string", () => {
    expect(
      getSessionFromCookies("foo=bar; auth_session=abc123; baz=qux"),
    ).toBe("abc123");
  });

  it("returns empty string when auth_session has empty value", () => {
    expect(getSessionFromCookies("auth_session=")).toBe("");
  });
});

describe("verifySession", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it("returns userId for a valid JWT", async () => {
    const token = await new SignJWT({ userId: "user-123" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const result = await verifySession(token);
    expect(result).toEqual({ userId: "user-123" });
  });

  it("returns null for an expired JWT", async () => {
    const token = await new SignJWT({ userId: "user-123" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("-1s")
      .sign(secret);

    const result = await verifySession(token);
    expect(result).toBeNull();
  });

  it("returns null for a JWT signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-123" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(wrongSecret);

    const result = await verifySession(token);
    expect(result).toBeNull();
  });

  it("returns null for a malformed token string", async () => {
    const result = await verifySession("not-a-jwt-at-all");
    expect(result).toBeNull();
  });

  it("returns null when SESSION_SECRET env var is missing", async () => {
    delete process.env.SESSION_SECRET;

    const token = await new SignJWT({ userId: "user-123" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const result = await verifySession(token);
    expect(result).toBeNull();
  });

  it("returns null when JWT payload has no userId field", async () => {
    const token = await new SignJWT({ sub: "user-123" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const result = await verifySession(token);
    expect(result).toBeNull();
  });
});
