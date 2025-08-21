"use client";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setSummary("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (data.error) {
      setSummary("❌ Error: " + data.error);
    } else {
      setSummary(data.summary || "No summary found");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10">
      <h1 className="text-2xl font-bold mb-5">📄 Legal Doc Analyzer</h1>
      <form onSubmit={handleUpload} className="flex flex-col items-center gap-4">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border p-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>
      </form>

      {summary && (
        <div className="mt-6 p-4 border rounded-lg w-1/2 bg-gray-800">
          <h2 className="text-lg font-semibold mb-2">📝 Summary</h2>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}
