import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/projects — list user's projects
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await query(
    `SELECT p.id, p.name, p.description, p.created_at
     FROM projects p
     JOIN project_members pm ON pm.project_id = p.id
     WHERE pm.user_id = $1
     ORDER BY p.created_at DESC`,
    [session.id]
  );

  return NextResponse.json(result.rows);
}

// POST /api/projects — create a project
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const result = await query(
    "INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING *",
    [name, description || null, session.id]
  );

  const project = result.rows[0];

  // Add creator as member
  await query(
    "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)",
    [project.id, session.id, session.role]
  );

  return NextResponse.json(project, { status: 201 });
}
