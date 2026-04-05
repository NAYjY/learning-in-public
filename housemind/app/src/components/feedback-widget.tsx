"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const pathname = usePathname();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: pathname, message }),
    });
    setMessage("");
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
    }, 2000);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <form
          onSubmit={submit}
          className="bg-white border rounded-lg shadow-lg p-4 w-80 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Send Feedback</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          {sent ? (
            <p className="text-green-600 text-sm">Thanks for your feedback!</p>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What could be better?"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
              />
              <button
                type="submit"
                className="w-full px-3 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
              >
                Send
              </button>
            </>
          )}
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-black text-white px-4 py-2 rounded-full text-sm shadow-lg hover:bg-gray-800"
        >
          Feedback
        </button>
      )}
    </div>
  );
}
