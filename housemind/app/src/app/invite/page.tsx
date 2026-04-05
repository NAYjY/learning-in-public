"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function InviteForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    if (res.ok) {
      router.push("/projects");
    } else {
      const data = await res.json();
      setError(data.error || "Invalid or expired invite");
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Invalid Invite</h1>
        <p className="text-gray-600">This invite link is missing a token.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Join HouseMind</h1>
      <p className="text-gray-600 text-sm">You&apos;ve been invited. Set up your account.</p>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full px-4 py-2 border rounded-lg"
      />
      <input
        type="password"
        placeholder="Choose a password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        className="w-full px-4 py-2 border rounded-lg"
      />
      <button
        type="submit"
        className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
      >
        Create Account
      </button>
    </form>
  );
}

export default function InvitePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <InviteForm />
      </Suspense>
    </main>
  );
}
