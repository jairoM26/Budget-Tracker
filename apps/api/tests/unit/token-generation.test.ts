import { describe, it, expect, beforeAll } from "vitest";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/utils/jwt";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-minimum-32-characters-long";
  process.env.JWT_EXPIRES_IN = "15m";
  process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret-minimum-32-chars";
});

describe("generateAccessToken", () => {
  it("returns a JWT string", () => {
    const token = generateAccessToken("user-123");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("encodes the userId as sub claim", () => {
    const token = generateAccessToken("user-abc");
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-abc");
  });
});

describe("generateRefreshToken", () => {
  it("returns a JWT string", () => {
    const token = generateRefreshToken("user-123");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("encodes the userId as sub claim", () => {
    const token = generateRefreshToken("user-xyz");
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe("user-xyz");
  });
});

describe("verifyAccessToken", () => {
  it("returns payload for a valid token", () => {
    const token = generateAccessToken("user-123");
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-123");
  });

  it("throws for a tampered token", () => {
    const token = generateAccessToken("user-123");
    const tampered = token.slice(0, -5) + "xxxxx";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it("throws for a token signed with the wrong secret", () => {
    const token = generateRefreshToken("user-123");
    expect(() => verifyAccessToken(token)).toThrow();
  });
});

describe("verifyRefreshToken", () => {
  it("returns payload for a valid token", () => {
    const token = generateRefreshToken("user-456");
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe("user-456");
  });

  it("throws for a token signed with the wrong secret", () => {
    const token = generateAccessToken("user-456");
    expect(() => verifyRefreshToken(token)).toThrow();
  });
});
