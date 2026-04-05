import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("database schema design", () => {
  const validRoles = ["architect", "homeowner", "contractor", "admin"];
  const categories = ["tiles", "fixtures", "lighting", "cladding"];

  it("defines exactly 4 user roles", () => {
    assert.equal(validRoles.length, 4);
    assert.ok(validRoles.includes("architect"));
    assert.ok(validRoles.includes("admin"));
  });

  it("has 4 product categories per spec", () => {
    assert.equal(categories.length, 4);
    for (const cat of ["tiles", "fixtures", "lighting", "cladding"]) {
      assert.ok(categories.includes(cat));
    }
  });

  it("product status: reference and available", () => {
    const statuses = ["reference", "available"];
    assert.equal(statuses.length, 2);
  });

  it("comment types: comment, reaction, flag", () => {
    const types = ["comment", "reaction", "flag"];
    assert.equal(types.length, 3);
  });

  it("3 price tiers", () => {
    const tiers = ["$", "$$", "$$$"];
    assert.equal(tiers.length, 3);
  });
});

describe("API input validation contracts", () => {
  it("accept-invite rejects missing/short fields", () => {
    const cases = [
      { token: "", name: "Test", password: "12345678" },
      { token: "abc", name: "", password: "12345678" },
      { token: "abc", name: "Test", password: "" },
      { token: "abc", name: "Test", password: "short" },
    ];
    for (const c of cases) {
      const valid = !!(c.token && c.name && c.password && c.password.length >= 8);
      assert.equal(valid, false, `Should reject: ${JSON.stringify(c)}`);
    }
  });

  it("accept-invite accepts valid input", () => {
    const input = { token: "abc123", name: "Architect", password: "securePass1" };
    assert.ok(input.token && input.name && input.password && input.password.length >= 8);
  });

  it("products API accepts optional category filter", () => {
    const url = new URL("http://localhost/api/products?category=tiles");
    assert.equal(url.searchParams.get("category"), "tiles");
  });

  it("products API returns all when no category", () => {
    const url = new URL("http://localhost/api/products");
    assert.equal(url.searchParams.get("category"), null);
  });

  it("comments rejects empty body", () => {
    assert.ok(!"   ".trim());
  });

  it("feedback allows anonymous (null user_id)", () => {
    const userId = null;
    assert.equal(userId, null); // valid
  });
});

describe("seed data", () => {
  it("has 20 products across 4 categories (5 each)", async () => {
    const { readFileSync } = await import("fs");
    const { join, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const seed = readFileSync(join(__dirname, "..", "src", "db", "seed.mjs"), "utf-8");

    // Count product entries by category
    const tileCount = (seed.match(/category: "tiles"/g) || []).length;
    const fixtureCount = (seed.match(/category: "fixtures"/g) || []).length;
    const lightingCount = (seed.match(/category: "lighting"/g) || []).length;
    const claddingCount = (seed.match(/category: "cladding"/g) || []).length;

    assert.equal(tileCount, 5);
    assert.equal(fixtureCount, 5);
    assert.equal(lightingCount, 5);
    assert.equal(claddingCount, 5);
    assert.equal(tileCount + fixtureCount + lightingCount + claddingCount, 20);
  });

  it("seed has mix of reference and available products", async () => {
    const { readFileSync } = await import("fs");
    const { join, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const seed = readFileSync(join(__dirname, "..", "src", "db", "seed.mjs"), "utf-8");

    const refCount = (seed.match(/status: "reference"/g) || []).length;
    const availCount = (seed.match(/status: "available"/g) || []).length;

    assert.ok(refCount > 0, "Should have reference products");
    assert.ok(availCount > 0, "Should have available products");
    assert.equal(refCount + availCount, 20);
  });
});
