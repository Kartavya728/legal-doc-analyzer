"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- FIX #3: Define types for our API responses for type safety ---
type ApiSuccessResponse = {
  analysis: string;
};

type ApiErrorResponse = {
  detail: string;
};

export default function UploadForm() {
  // --- FIX #1: Explicitly type all state variables ---
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setError("Invalid file type. Please upload a PDF.");
      return;
    }
    setError("");
    setFile(selectedFile);
  };

  // --- FIX #2: Add correct TypeScript types for React Drag Events ---
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      // Use our defined types to handle the response safely
      const data: ApiSuccessResponse | ApiErrorResponse = await response.json();

      if (!response.ok) {
        // Type guard to ensure we're accessing the 'detail' property safely
        if ('detail' in data) {
          throw new Error(data.detail);
        }
        throw new Error("An unknown error occurred.");
      }
      
      // Type guard for the success case
      if ('analysis' in data) {
        setAnalysisResult(data.analysis);
        toast.success("Analysis complete!", { id: toastId });
      } else {
        throw new Error("Invalid success response from server.");
      }

    } catch (err) {
      // --- FIX #4: More robust error handling ---
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message, { id: toastId });
      } else {
        const errorMessage = "An unexpected error occurred.";
        setError(errorMessage);
        toast.error(errorMessage, { id: toastId });
      }
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
          // --- FIX #2: Type the change event for the file input ---
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            e.target.files && handleFileSelect(e.target.files[0])
          }
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
          >
            {analysisResult}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}