"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setError("Invalid file type. Please upload a PDF.");
      return;
    }
    setError("");
    setFile(selectedFile);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setError("");
    const toastId = toast.loading("Analyzing document...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "An unknown error occurred.");
      }

      setAnalysisResult(data.analysis);
      toast.success("Analysis complete!", { id: toastId });
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-8 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full p-10 border-2 border-dashed rounded-lg transition-all duration-300 ${
          isDragging ? "border-purple-500 bg-gray-700" : "border-gray-600"
        }`}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          accept=".pdf"
        />
        <p className="text-gray-400">Drag & drop a PDF here, or click to select</p>
        {file && <p className="mt-2 text-green-400 font-semibold">{file.name}</p>}
      </div>

      {error && <p className="mt-4 text-center text-red-400">{error}</p>}

      {/* Submit Button */}
      <div className="mt-6 text-center">
        <button
          onClick={handleSubmit}
          disabled={!file || isLoading}
          className="px-8 py-3 font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isLoading ? "Processing..." : "Analyze Document"}
        </button>
      </div>

      {/* Results Area */}
      {analysisResult && (
        <div className="mt-8 p-6 bg-gray-900/50 border border-gray-700 rounded-lg">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            className="prose prose-invert prose-headings:text-purple-300 prose-strong:text-pink-400"
          >
            {analysisResult}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}