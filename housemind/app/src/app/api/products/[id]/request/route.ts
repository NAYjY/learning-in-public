import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/products/[id]/request — increment availability_requests
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await query(
    "UPDATE products SET availability_requests = availability_requests + 1 WHERE id = $1",
    [id]
  );
  return NextResponse.json({ ok: true });
}
