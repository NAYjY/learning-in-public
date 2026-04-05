import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scryptSync, randomBytes } from "crypto";

function hashPassword(password, salt) {
  const s = salt || randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 64).toString("hex");
  return { hash: `${s}:${hash}`, salt: s };
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const computed = scryptSync(password, salt, 64).toString("hex");
  return hash === computed;
}

describe("password hashing", () => {
  it("hashes and verifies a password correctly", () => {
    const { hash } = hashPassword("securePassword123");
    assert.ok(hash.includes(":"));
    assert.ok(verifyPassword("securePassword123", hash));
  });

  it("rejects wrong password", () => {
    const { hash } = hashPassword("securePassword123");
    assert.ok(!verifyPassword("wrongPassword", hash));
  });

  it("produces different hashes for same password (random salt)", () => {
    const { hash: h1 } = hashPassword("samePassword");
    const { hash: h2 } = hashPassword("samePassword");
    assert.notEqual(h1, h2);
  });

  it("produces same hash with same salt", () => {
    const { hash: h1, salt } = hashPassword("testPass");
    const { hash: h2 } = hashPassword("testPass", salt);
    assert.equal(h1, h2);
  });

  it("hash format: salt(32hex):hash(128hex)", () => {
    const { hash } = hashPassword("password");
    const [salt, hval] = hash.split(":");
    assert.match(salt, /^[0-9a-f]{32}$/);
    assert.match(hval, /^[0-9a-f]{128}$/);
  });
});
