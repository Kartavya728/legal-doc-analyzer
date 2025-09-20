"use client";

import { useState, useEffect } from "react";
import Display from "./Display";
import ProcessingStatus from "./processing-status";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, GitCompareArrows, ShieldCheck, UploadCloud } from "lucide-react";

type AnalysisType = 'detailed' | 'compare' | 'safe';

interface HomePageProps {
  user: any;
  document?: any;
}

const FileInput = ({ file, onFileChange, index }: { file: File | null; onFileChange: (file: File, index: number) => void; index: number; }) => (
  <label htmlFor={`file-upload-${index}`} className="relative cursor-pointer block w-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-300 rounded-lg p-5 border-2 border-dashed border-gray-600 text-gray-400 hover:text-white group">
    <div className="flex flex-col items-center justify-center space-y-2 text-center h-32">
      {!file ? (
        <>
          <UploadCloud className="w-10 h-10 text-gray-500 group-hover:text-cyan-400 transition-colors duration-300" />
          <span className="font-semibold text-base">Drop file or <span className="text-cyan-400 group-hover:underline">Browse</span></span>
          <span className="text-xs text-gray-500">Max file size: 10MB</span>
        </>
      ) : (
        <>
          <FileText className="w-10 h-10 text-cyan-400" />
          <span className="font-semibold text-base text-white break-all">{file.name}</span>
          <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </>
      )}
    </div>
    <input
      id={`file-upload-${index}`}
      type="file"
      required
      onChange={(e) => {
        if (e.target.files?.[0]) {
          onFileChange(e.target.files[0], index);
        }
      }}
      className="sr-only"
    />
  </label>
);

export default function HomePage({ user, document }: HomePageProps) {
  const supabase = createClientComponentClient();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>([null, null]);
  const [uploadImageUrl, setUploadImageUrl] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(true);
  const [processingStep, setProcessingStep] = useState("Initializing...");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('detailed');

  useEffect(() => {
    if (document) {
      setResult(document);
      setShowUploadForm(false);
    }
  }, [document]);

  const handleFileChange = (file: File, index: number) => {
    const newFiles = [...selectedFiles];
    newFiles[index] = file;
    setSelectedFiles(newFiles);
    if (index === 0 && file) {
      setUploadImageUrl(URL.createObjectURL(file));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isCompareMode = analysisType === 'compare';
    if (!selectedFiles[0] || (isCompareMode && !selectedFiles[1])) {
      alert(isCompareMode ? "Please upload both documents." : "Please select a file.");
      return;
    }

    setIsTransitioning(true);
    setLoading(true);
    setTimeout(() => setShowUploadForm(false), 300);

    const formData = new FormData();
    let apiEndpoint = "";

    switch (analysisType) {
      case 'compare':
        formData.append("file1", selectedFiles[0] as Blob);
        formData.append("file2", selectedFiles[1] as Blob);
        apiEndpoint = "/api/compare-docs";
        break;
      case 'safe':
        formData.append("file", selectedFiles[0] as Blob);
        apiEndpoint = "/api/safe-analysis";
        break;
      case 'detailed':
      default:
        formData.append("file", selectedFiles[0] as Blob);
        apiEndpoint = "/api/upload-stream";
        break;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be logged in.");

      setProcessingStep("Uploading and processing...");
      setProcessingProgress(10);
      
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: "Unknown server error" }));
        throw new Error(`Server error: ${res.statusText} - ${errorBody.error}`);
      }
      
      let finalResultData = null;

      if (analysisType === 'detailed' && res.body) {
        console.log("Handling streaming response...");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let streamedData = "";

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
              setProcessingStep(update.message || update.status);
              if (update.status === "complete" && update.result) {
                finalResultData = update.result;
              }
            } catch (e) {
              console.warn("Could not parse stream line as JSON:", line);
            }
          }
        }
      } else {
        console.log("Handling single JSON response...");
        finalResultData = await res.json();
      }

      setProcessingStep("Finalizing results...");
      setProcessingProgress(95);

      if (finalResultData) {
        setResult({ analysisType, ...finalResultData });
        setProcessingProgress(100);
        setProcessingStep("Complete");
      } else {
        throw new Error("Analysis succeeded but returned an empty result.");
      }

    } catch (err: any) {
      alert(`Analysis Failed: ${err.message}`);
      console.error("Frontend handleSubmit error:", err);
      setShowUploadForm(true);
    } finally {
      setLoading(false);
      setIsTransitioning(false);
    }
  };

  const analysisOptions = [
      { id: 'detailed', icon: FileText, label: 'Detailed Analysis' },
      { id: 'compare', icon: GitCompareArrows, label: 'Compare Docs' },
      { id: 'safe', icon: ShieldCheck, label: 'Safe Analysis' }
  ];

  const isSubmitDisabled = loading || !selectedFiles[0] || (analysisType === 'compare' && !selectedFiles[1]);

  // --- THIS IS THE CORRECTED JSX ---
  return (
    <div className="relative min-h-screen w-full overflow-auto bg-gray-900 text-white p-4 sm:p-6">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <AnimatePresence mode="wait">
        {showUploadForm && (
          <motion.div
            key="upload-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="relative z-10 flex min-h-[calc(100vh-3rem)] items-center justify-center"
          >
            <div className="w-full max-w-2xl">
              <div className="bg-gray-900/70 backdrop-blur-xl rounded-2xl p-6 sm:p-10 shadow-2xl border border-gray-700/50">
                <motion.div animate={{ opacity: isTransitioning ? 0 : 1 }} transition={{ duration: 0.2 }}>
                  <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-500">
                      LEGAL MASTER
                    </h1>
                    <p className="text-gray-400 mt-2">Unlock insights from your documents with AI.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-8 bg-gray-800/60 p-2 rounded-lg">
                    {analysisOptions.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setAnalysisType(opt.id as AnalysisType)}
                          className={`flex items-center justify-center gap-2 p-3 rounded-md text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${analysisType === opt.id ? 'bg-cyan-500 text-white shadow-lg' : 'bg-transparent text-gray-300 hover:bg-gray-700'}`}
                        >
                          <Icon className="w-5 h-5"/>
                          <span className="text-center">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
                    {analysisType === 'compare' ? (
                      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileInput file={selectedFiles[0]} onFileChange={handleFileChange} index={0}/>
                        <FileInput file={selectedFiles[1]} onFileChange={handleFileChange} index={1}/>
                      </div>
                    ) : (
                      <div className="w-full">
                        <FileInput file={selectedFiles[0]} onFileChange={handleFileChange} index={0}/>
                      </div>
                    )}
                    <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:saturate-50" disabled={isSubmitDisabled}>
                      {loading ? "Processing..." : "Upload & Analyze"}
                    </motion.button>
                  </form>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
        {loading && !showUploadForm && <ProcessingStatus currentStep={processingStep} progress={processingProgress} />}
        {result && !loading && <Display data={result} loading={loading} uploadedImageUrl={uploadImageUrl} />}
      </AnimatePresence>
    </div>
  );
}