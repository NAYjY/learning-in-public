import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/projects/[id] — project detail with products and comments
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify membership
  const memberCheck = await query(
    "SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2",
    [id, session.id]
  );
  if (memberCheck.rows.length === 0) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Get project
  const projectResult = await query("SELECT id, name, description FROM projects WHERE id = $1", [id]);
  if (projectResult.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get project products with product details
  const itemsResult = await query(
    `SELECT pp.id, pp.notes, pp.added_by,
            json_build_object('id', pr.id, 'name', pr.name, 'category', pr.category, 'status', pr.status, 'image_url', pr.image_url) as product
     FROM project_products pp
     JOIN products pr ON pr.id = pp.product_id
     WHERE pp.project_id = $1
     ORDER BY pp.created_at DESC`,
    [id]
  );

  // Get comments for each project product
  const items = await Promise.all(
    itemsResult.rows.map(async (item: { id: string; notes: string; added_by: string; product: object }) => {
      const commentsResult = await query(
        `SELECT c.id, c.body, u.name as user_name, u.role as user_role, c.created_at
         FROM comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.project_product_id = $1
         ORDER BY c.created_at ASC`,
        [item.id]
      );
      return { ...item, comments: commentsResult.rows };
    })
  );

  return NextResponse.json({ ...projectResult.rows[0], items });
}
