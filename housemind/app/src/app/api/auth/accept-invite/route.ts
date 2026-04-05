import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { scryptSync, randomBytes } from "crypto";

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 64).toString("hex");
  return { hash: `${s}:${hash}`, salt: s };
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const { hash: computed } = hashPassword(password, salt);
  const [, computedHash] = computed.split(":");
  return hash === computedHash;
}

// POST /api/auth/accept-invite — accept an invite token, create account
export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json();

  if (!token || !name || !password || password.length < 8) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  // Find valid token
  const result = await query(
    "SELECT * FROM invite_tokens WHERE token = $1 AND used = false AND expires_at > now()",
    [token]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
  }

  const invite = result.rows[0];
  const { hash } = hashPassword(password);

  // Create user
  const userResult = await query(
    "INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
    [invite.email, name, invite.role, hash]
  );

  // Mark token as used
  await query("UPDATE invite_tokens SET used = true WHERE id = $1", [invite.id]);

  const user = userResult.rows[0];
  const sessionToken = await createSession(user);
  await setSessionCookie(sessionToken);

  return NextResponse.json({ ok: true });
}
