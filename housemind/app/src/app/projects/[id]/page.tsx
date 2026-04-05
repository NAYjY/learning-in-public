"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

type ProjectProduct = {
  id: string;
  product: { id: string; name: string; category: string; status: string; image_url: string | null };
  notes: string | null;
  added_by: string;
  comments: Comment[];
};

type Comment = {
  id: string;
  body: string;
  user_name: string;
  user_role: string;
  created_at: string;
};

const ROLE_COLORS: Record<string, string> = {
  architect: "bg-blue-100 text-blue-800",
  homeowner: "bg-purple-100 text-purple-800",
  contractor: "bg-orange-100 text-orange-800",
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<ProjectProduct[]>([]);
  const [projectName, setProjectName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProjectName(data.name);
      setItems(data.items);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">{projectName || "Project"}</h1>
      <p className="text-gray-500 mb-8">
        {items.length} product{items.length !== 1 ? "s" : ""} on this board
      </p>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-6">
            <div className="flex gap-4 mb-4">
              {item.product.image_url ? (
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="w-24 h-24 rounded object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                  No image
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{item.product.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{item.product.category}</p>
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                    item.product.status === "available"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {item.product.status}
                </span>
                {item.notes && (
                  <p className="text-sm text-gray-600 mt-2">{item.notes}</p>
                )}
              </div>
            </div>

            {/* Comments */}
            <div className="border-t pt-4 space-y-3">
              {item.comments.map((c) => (
                <div key={c.id} className="flex gap-2 text-sm">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ROLE_COLORS[c.user_role] || "bg-gray-100"
                    }`}
                  >
                    {c.user_name}
                  </span>
                  <p className="text-gray-700">{c.body}</p>
                </div>
              ))}
              <CommentInput projectProductId={item.id} onComment={load} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function CommentInput({
  projectProductId,
  onComment,
}: {
  projectProductId: string;
  onComment: () => void;
}) {
  const [body, setBody] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const res = await fetch(`/api/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_product_id: projectProductId, body }),
    });
    if (res.ok) {
      setBody("");
      onComment();
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2 mt-2">
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment..."
        className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
      />
      <button
        type="submit"
        className="px-4 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
      >
        Send
      </button>
    </form>
  );
}
