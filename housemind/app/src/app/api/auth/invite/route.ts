import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/auth/invite — admin creates an invite
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role } = await req.json();
  if (!email || !role) {
    return NextResponse.json({ error: "Email and role required" }, { status: 400 });
  }

  const result = await query(
    "INSERT INTO invite_tokens (email, role, invited_by) VALUES ($1, $2, $3) RETURNING token",
    [email, role, session.id]
  );

  const token = result.rows[0].token;
  const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/invite?token=${token}`;

  return NextResponse.json({ inviteUrl, token });
}
