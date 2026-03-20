import { describe, it, expect } from "vitest";
import { createRequest, createResponse } from "node-mocks-http";
import { authenticate } from "../../src/middleware/authenticate";
import { generateAccessToken } from "../../src/utils/jwt";

describe("authenticate middleware", () => {
  it("calls next() and sets req.user when token is valid", () => {
    const token = generateAccessToken("user-123");
    const req = createRequest({ headers: { authorization: `Bearer ${token}` } });
    const res = createResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ id: "user-123" });
  });

  it("returns 401 when Authorization header is missing", () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    const body = res._getJSONData();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when Authorization header does not start with Bearer", () => {
    const req = createRequest({ headers: { authorization: "Basic abc123" } });
    const res = createResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when token is malformed", () => {
    const req = createRequest({ headers: { authorization: "Bearer not.a.token" } });
    const res = createResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    const body = res._getJSONData();
    expect(body.error.message).toBe("Invalid or expired token");
  });

  it("returns 401 when token is signed with a different secret", () => {
    // sign with wrong secret manually
    const jwt = require("jsonwebtoken");
    const badToken = jwt.sign({ sub: "user-123" }, "wrong-secret", { expiresIn: "15m" });
    const req = createRequest({ headers: { authorization: `Bearer ${badToken}` } });
    const res = createResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
