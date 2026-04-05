// Seed script — run: node src/db/seed.mjs
// Requires DATABASE_URL env var or defaults to postgresql://localhost:5432/housemind

import pg from "pg";
import { scryptSync, randomBytes } from "crypto";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/housemind",
});

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const adminHash = hashPassword("admin123456");
  const admin = await pool.query(
    `INSERT INTO users (email, name, role, password_hash)
     VALUES ('admin@housemind.com', 'Admin', 'admin', $1)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [adminHash]
  );
  const adminId = admin.rows[0]?.id;
  if (!adminId) {
    console.log("Admin already exists, skipping seed.");
    await pool.end();
    return;
  }
  console.log("  Created admin user");

  // Sample products across all categories
  const products = [
    // Tiles
    { name: "Porcelain Honed 60x60", category: "tiles", description: "Italian porcelain, matte finish. Great for living areas.", status: "reference", price_tier: "$$" },
    { name: "Zellige Terracotta 10x10", category: "tiles", description: "Handmade Moroccan zellige tiles, natural terracotta tone.", status: "reference", price_tier: "$$$" },
    { name: "Subway White Gloss 10x20", category: "tiles", description: "Classic white subway tile, high gloss.", status: "available", price_tier: "$" },
    { name: "Hexagonal Marble Mosaic", category: "tiles", description: "Carrara marble hexagon mosaic, polished.", status: "reference", price_tier: "$$$" },
    { name: "Large Format Concrete 120x60", category: "tiles", description: "Concrete-look porcelain, ideal for modern interiors.", status: "available", price_tier: "$$" },
    // Fixtures
    { name: "Matte Black Basin Mixer", category: "fixtures", description: "Single lever basin mixer, solid brass, matte black.", status: "available", price_tier: "$$" },
    { name: "Wall-Hung Toilet Rimless", category: "fixtures", description: "Rimless wall-hung toilet, concealed cistern compatible.", status: "reference", price_tier: "$$" },
    { name: "Freestanding Stone Bath", category: "fixtures", description: "Natural stone composite freestanding bathtub, 1700mm.", status: "reference", price_tier: "$$$" },
    { name: "Rainfall Shower Head 300mm", category: "fixtures", description: "Ultra-slim ceiling-mounted rain shower, stainless steel.", status: "available", price_tier: "$$" },
    { name: "Double Vanity 1200mm", category: "fixtures", description: "Solid timber vanity with stone top, wall-mounted.", status: "reference", price_tier: "$$$" },
    // Lighting
    { name: "Recessed LED Downlight 3000K", category: "lighting", description: "Dimmable warm white recessed downlight, IP44.", status: "available", price_tier: "$" },
    { name: "Pendant Brass Globe", category: "lighting", description: "Brushed brass pendant with opal glass globe.", status: "reference", price_tier: "$$" },
    { name: "LED Strip Under-Cabinet", category: "lighting", description: "Warm white LED strip, adhesive mount, 5m roll.", status: "available", price_tier: "$" },
    { name: "Architectural Wall Sconce", category: "lighting", description: "Minimal plaster wall sconce, paintable, up/down light.", status: "reference", price_tier: "$$" },
    { name: "Outdoor Bollard Light", category: "lighting", description: "Powder-coated aluminium bollard, 800mm height.", status: "reference", price_tier: "$$" },
    // Cladding
    { name: "Timber Look Aluminium Battens", category: "cladding", description: "Woodgrain aluminium battens, low maintenance.", status: "available", price_tier: "$$" },
    { name: "Natural Stone Veneer", category: "cladding", description: "Thin-cut sandstone veneer panels for feature walls.", status: "reference", price_tier: "$$$" },
    { name: "Fibre Cement Weatherboard", category: "cladding", description: "Pre-primed fibre cement boards, 4200mm lengths.", status: "available", price_tier: "$" },
    { name: "Corrugated Metal Sheeting", category: "cladding", description: "Colorbond corrugated steel, multiple colour options.", status: "available", price_tier: "$" },
    { name: "Brick Slip System", category: "cladding", description: "Thin brick slips with rail mounting system, real clay.", status: "reference", price_tier: "$$" },
  ];

  for (const p of products) {
    await pool.query(
      `INSERT INTO products (name, category, description, status, price_tier)
       VALUES ($1, $2, $3, $4, $5)`,
      [p.name, p.category, p.description, p.status, p.price_tier]
    );
  }
  console.log(`  Seeded ${products.length} products`);

  console.log("Done.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
