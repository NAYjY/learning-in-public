import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/products?category=tiles
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");

  let sql = "SELECT id, name, category, description, image_url, status, price_tier, availability_requests FROM products";
  const params: string[] = [];

  if (category) {
    sql += " WHERE category = $1";
    params.push(category);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params);
  return NextResponse.json(result.rows);
}
