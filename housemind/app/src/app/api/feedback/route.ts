import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/feedback
export async function POST(req: NextRequest) {
  const session = await getSession();
  const { page, message } = await req.json();

  if (!page || !message?.trim()) {
    return NextResponse.json({ error: "Page and message required" }, { status: 400 });
  }

  await query(
    "INSERT INTO feedback (user_id, page, message) VALUES ($1, $2, $3)",
    [session?.id || null, page, message.trim()]
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
