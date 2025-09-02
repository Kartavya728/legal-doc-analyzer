"use client";

import { useState } from "react";
import Display from "../components/Display";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function HomePage({ user }: { user: any }) {
  const supabase = createClientComponentClient();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("You must be logged in.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data.result);
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error("Frontend upload error:", err);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Legal Document Analyzer</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Logout
        </button>
      </div>

      <p className="mb-4">Logged in as <b>{user.email}</b></p>

      <form onSubmit={handleUpload} className="space-y-4">
        <input type="file" name="file" required />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Processing..." : "Upload"}
        </button>
      </form>

      {result && <Display data={result} />}
    </main>
  );
}
