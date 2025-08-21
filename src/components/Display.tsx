"use client";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Image from "next/image";

export default function Display() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setSummary(""); 

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setSummary("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      
      const data = await res.json();

      if (data.error) {
        setSummary("❌ Error: " + data.error);
      } else {
        setSummary(data.summary || "No summary found");
      }

    } catch (error: any) {
      setSummary("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 text-center">📄 Legal Doc Analyzer</h1>
      <form onSubmit={handleUpload} className="w-full flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-lg">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>
      </form>

      {/* Container for Image Preview and Summary */}
      <div className="mt-8 w-full p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 shadow-inner">
        {/* Image Preview Section */}
        {previewUrl && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 text-center">📷 Image Preview</h2>
            <div className="relative w-full h-96 border rounded-md overflow-hidden">
                <Image
                    src={previewUrl}
                    alt="Selected file preview"
                    fill
                    style={{ objectFit: 'contain' }}
                />
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center items-center my-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Summary Section */}
        {summary && (
          <div>
            <h2 className="text-xl font-semibold mb-2 text-center">📝 Summary</h2>
            <div className="p-4 bg-white dark:bg-gray-700 rounded-md">
                <p className="whitespace-pre-wrap">{summary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}