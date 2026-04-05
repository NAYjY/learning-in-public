import { describe, it, expect } from "vitest";
import { scryptSync, randomBytes } from "crypto";

// Extracted password logic (mirrors accept-invite/route.ts)
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 64).toString("hex");
  return { hash: `${s}:${hash}`, salt: s };
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const computed = scryptSync(password, salt, 64).toString("hex");
  return hash === computed;
}

describe("password hashing", () => {
  it("hashes and verifies a password correctly", () => {
    const { hash } = hashPassword("securePassword123");
    expect(hash).toContain(":");
    expect(verifyPassword("securePassword123", hash)).toBe(true);
  });

  it("rejects wrong password", () => {
    const { hash } = hashPassword("securePassword123");
    expect(verifyPassword("wrongPassword", hash)).toBe(false);
  });

  it("produces different hashes for same password (random salt)", () => {
    const { hash: h1 } = hashPassword("samePassword");
    const { hash: h2 } = hashPassword("samePassword");
    expect(h1).not.toBe(h2);
  });

  it("produces same hash with same salt", () => {
    const { hash: h1, salt } = hashPassword("testPass");
    const { hash: h2 } = hashPassword("testPass", salt);
    expect(h1).toBe(h2);
  });

  it("hash has expected format (salt:hex)", () => {
    const { hash } = hashPassword("password");
    const parts = hash.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]{32}$/); // 16-byte salt = 32 hex chars
    expect(parts[1]).toMatch(/^[0-9a-f]{128}$/); // 64-byte hash = 128 hex chars
  });
});
