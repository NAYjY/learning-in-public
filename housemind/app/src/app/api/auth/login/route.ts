import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { scryptSync } from "crypto";

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const computed = scryptSync(password, salt, 64).toString("hex");
  return hash === computed;
}

// POST /api/auth/login
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const result = await query("SELECT * FROM users WHERE email = $1", [email]);

  if (result.rows.length === 0 || !result.rows[0].password_hash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = result.rows[0];
  if (!verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionToken = await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await setSessionCookie(sessionToken);

  return NextResponse.json({ ok: true });
}
