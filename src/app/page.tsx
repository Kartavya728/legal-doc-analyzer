"use client";

import { useState } from "react";
import Display from "../components/Display";

export default function HomePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data.result);
    } catch (error) {
      console.error("Upload failed:", error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Legal Document Analyzer</h1>

      <form onSubmit={handleUpload} className="space-y-4 mb-6">
        <input type="file" name="file" required />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Processing..." : "Upload"}
        </button>
      </form>

      {/* Always render Display */}
      <Display data={result} loading={loading} />
    </main>
  );
}
