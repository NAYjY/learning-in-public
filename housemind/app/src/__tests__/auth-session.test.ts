import { describe, it, expect } from "vitest";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode("test-secret");

// Mirrors createSession from src/lib/auth.ts
async function createSession(user: { id: string; email: string; name: string; role: string }) {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

async function verifySession(token: string) {
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
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT format
  });

  it("token contains correct claims", async () => {
    const token = await createSession(testUser);
    const payload = await verifySession(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.email).toBe("arch@test.com");
    expect(payload.name).toBe("Test Architect");
    expect(payload.role).toBe("architect");
  });

  it("token has expiry set", async () => {
    const token = await createSession(testUser);
    const payload = await verifySession(token);

    expect(payload.exp).toBeDefined();
    // Should expire ~7 days from now
    const now = Math.floor(Date.now() / 1000);
    const sevenDays = 7 * 24 * 60 * 60;
    expect(payload.exp! - now).toBeGreaterThan(sevenDays - 60); // within 60s tolerance
    expect(payload.exp! - now).toBeLessThanOrEqual(sevenDays + 1);
  });

  it("rejects token with wrong secret", async () => {
    const token = await createSession(testUser);
    const wrongSecret = new TextEncoder().encode("wrong-secret");

    await expect(jwtVerify(token, wrongSecret)).rejects.toThrow();
  });

  it("handles all user roles", async () => {
    for (const role of ["architect", "homeowner", "contractor", "admin"]) {
      const token = await createSession({ ...testUser, role });
      const payload = await verifySession(token);
      expect(payload.role).toBe(role);
    }
  });
});
