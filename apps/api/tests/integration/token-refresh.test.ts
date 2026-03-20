import { describe, it, expect } from "vitest";
import { request } from "../helpers";

async function registerAndGetCookie(): Promise<string> {
  const res = await request.post("/auth/register").send({
    email: `user-${Date.now()}-${Math.random()}@example.com`,
    password: "password123",
    name: "Test User",
  });
  const cookies = res.headers["set-cookie"] as unknown as string[];
  return cookies.find((c: string) => c.startsWith("refreshToken="))!;
}

describe("POST /auth/refresh", () => {
  it("returns 200 with a new access token", async () => {
    const cookie = await registerAndGetCookie();

    const res = await request.post("/auth/refresh").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it("sets a new refreshToken cookie (rotation)", async () => {
    const cookie = await registerAndGetCookie();
    const originalToken = cookie.split("=")[1].split(";")[0];

    const res = await request.post("/auth/refresh").set("Cookie", cookie);

    const newCookies = res.headers["set-cookie"] as unknown as string[];
    const newCookie = newCookies.find((c: string) => c.startsWith("refreshToken="))!;
    const newToken = newCookie.split("=")[1].split(";")[0];

    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(originalToken);
  });

  it("old refresh token is invalid after rotation", async () => {
    const cookie = await registerAndGetCookie();

    await request.post("/auth/refresh").set("Cookie", cookie);

    // Attempt to use the old cookie again
    const res = await request.post("/auth/refresh").set("Cookie", cookie);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when no refresh cookie is present", async () => {
    const res = await request.post("/auth/refresh");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for a tampered refresh token", async () => {
    const res = await request
      .post("/auth/refresh")
      .set("Cookie", "refreshToken=tampered.token.value; Path=/auth/refresh; HttpOnly");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
