import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/comments
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { project_product_id, body } = await req.json();
  if (!project_product_id || !body?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify user is a member of the project
  const memberCheck = await query(
    `SELECT 1 FROM project_products pp
     JOIN project_members pm ON pm.project_id = pp.project_id AND pm.user_id = $2
     WHERE pp.id = $1`,
    [project_product_id, session.id]
  );
  if (memberCheck.rows.length === 0) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await query(
    "INSERT INTO comments (project_product_id, user_id, body) VALUES ($1, $2, $3) RETURNING *",
    [project_product_id, session.id, body.trim()]
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
