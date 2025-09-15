"use client";

import { useState, useEffect } from "react";
import Display from "./Display";
import ProcessingStatus from "./processing-status";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { motion, AnimatePresence } from "framer-motion";

interface HomePageProps {
  user: any;
  document?: any;
}

export default function HomePage({ user, document }: HomePageProps) {
  const supabase = createClientComponentClient();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadImageUrl, setUploadImageUrl] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(true);
  const [processingStep, setProcessingStep] = useState("Uploading document");
  const [processingProgress, setProcessingProgress] = useState(0);

  useEffect(() => {
    if (document) {
      console.log("Document data received:", document);
      setResult(document);
      setShowUploadForm(false);
    }
  }, [document]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    if (file) setUploadImageUrl(URL.createObjectURL(file));
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsTransitioning(true);
    setLoading(true);
    setTimeout(() => setShowUploadForm(false), 300);

    const processingSteps = [
      "Uploading document",
      "Extracting text",
      "Analyzing content",
      "Generating summary",
      "Identifying key points",
      "Assessing risks",
      "Preparing results"
    ];
    
    let currentStep = 0;
    const totalSteps = processingSteps.length;
    
    const progressInterval = setInterval(() => {
      if (currentStep < totalSteps) {
        setProcessingStep(processingSteps[currentStep]);
        setProcessingProgress(Math.round((currentStep / (totalSteps - 1)) * 100));
        currentStep++;
      } else clearInterval(progressInterval);
    }, 1500);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be logged in.");

      const res = await fetch("/api/upload-stream", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.body) throw new Error("Response body is null");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedData = "";
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        streamedData += decoder.decode(value, { stream: true });
        const lines = streamedData.split("\n");
        streamedData = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const update = JSON.parse(line);
            if (update.status) {
              setProcessingStep(update.message || update.status);
              const progressMap: Record<string, number> = {
                uploading: 10,
                extracting: 20,
                translating: 30,
                analyzing: 40,
                classifying: 50,
                classified: 60,
                processing: 70,
                streaming: 80,
                generating_ui: 90,
                saving: 95,
                complete: 100,
                error: 100
              };
              setProcessingProgress(progressMap[update.status] || processingProgress);
              if (update.status === "complete" && update.result) finalResult = update.result;
            }
          } catch {}
        }
      }

      if (finalResult) setResult({ ...finalResult, uploadedImageUrl: uploadImageUrl });
      else setShowUploadForm(true);
    } catch (err) {
      console.error("Frontend upload error:", err);
      setShowUploadForm(true);
    }

    setLoading(false);
    setIsTransitioning(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-auto">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-80 h-80 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <AnimatePresence mode="wait">
        {showUploadForm && (
          <motion.div
            key="upload-form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: isTransitioning ? 20 : 1, opacity: isTransitioning ? 0 : 1 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="bg-black/50 backdrop-filter backdrop-blur-lg rounded-2xl p-10 shadow-2xl border border-gray-700/30 max-w-lg w-full"
            >
              <motion.div animate={{ opacity: isTransitioning ? 0 : 1 }} transition={{ duration: 0.2 }}>
                <h1 className="text-4xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-600 text-center">
                  PSM Ka BDSM Ai
                </h1>
                <form onSubmit={handleUpload} className="flex flex-col items-center gap-6">
                  <label htmlFor="file-upload" className="relative cursor-pointer block w-full bg-gray-800/30 hover:bg-gray-700/30 transition-colors duration-300 rounded-lg p-5 border-2 border-dashed border-gray-600 text-gray-300 hover:text-white group">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {!selectedFile ? (
                        <>
                          <svg className="w-10 h-10 text-gray-400 group-hover:text-blue-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                          </svg>
                          <span className="font-semibold text-lg">Drag & Drop your file or <span className="text-blue-400 group-hover:underline">Browse</span></span>
                          <span className="text-sm text-gray-500">Max file size: 10MB</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-lg text-blue-400">{selectedFile.name}</span>
                          <span className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </>
                      )}
                    </div>
                    <input id="file-upload" type="file" required onChange={handleFileChange} className="sr-only" />
                  </label>
                  <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!selectedFile || loading}>
                    {loading ? "Processing..." : "Upload & Analyze"}
                  </motion.button>
                </form>
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {loading && !showUploadForm && <ProcessingStatus currentStep={processingStep} progress={processingProgress} />}

        {result && !loading && <Display data={result} loading={loading} uploadedImageUrl={uploadImageUrl} />}
      </AnimatePresence>
    </div>
  );
}
