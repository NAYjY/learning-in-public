"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const project = await res.json();
      setProjects((prev) => [project, ...prev]);
      setName("");
      setShowCreate(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          New Project
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createProject} className="mb-8 flex gap-2">
          <input
            type="text"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Create
          </button>
        </form>
      )}

      <div className="space-y-4">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="block p-6 border rounded-lg hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold">{p.name}</h2>
            {p.description && (
              <p className="text-gray-600 mt-1">{p.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Created {new Date(p.created_at).toLocaleDateString()}
            </p>
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            No projects yet. Create one to start curating products.
          </p>
        )}
      </div>
    </main>
  );
}
