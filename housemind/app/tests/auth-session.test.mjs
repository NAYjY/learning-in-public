import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode("test-secret");

async function createSession(user) {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

async function verifySession(token) {
  const { payload } = await jwtVerify(token, SECRET);
  return payload;
}

describe("JWT session", () => {
  const testUser = {
    id: "user-123",
    email: "arch@test.com",
    name: "Test Architect",
    role: "architect",
  };

  it("creates a valid JWT token", async () => {
    const token = await createSession(testUser);
    assert.ok(token);
    assert.equal(typeof token, "string");
    assert.equal(token.split(".").length, 3);
  });

  it("token contains correct claims", async () => {
    const token = await createSession(testUser);
    const payload = await verifySession(token);
    assert.equal(payload.sub, "user-123");
    assert.equal(payload.email, "arch@test.com");
    assert.equal(payload.name, "Test Architect");
    assert.equal(payload.role, "architect");
  });

  it("token expires in ~7 days", async () => {
    const token = await createSession(testUser);
    const payload = await verifySession(token);
    assert.ok(payload.exp);
    const now = Math.floor(Date.now() / 1000);
    const sevenDays = 7 * 24 * 60 * 60;
    assert.ok(payload.exp - now > sevenDays - 60);
    assert.ok(payload.exp - now <= sevenDays + 1);
  });

  it("rejects token with wrong secret", async () => {
    const token = await createSession(testUser);
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    await assert.rejects(() => jwtVerify(token, wrongSecret));
  });

  it("handles all user roles", async () => {
    for (const role of ["architect", "homeowner", "contractor", "admin"]) {
      const token = await createSession({ ...testUser, role });
      const payload = await verifySession(token);
      assert.equal(payload.role, role);
    }
  });
});
