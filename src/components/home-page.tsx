"use client";

import { useState, useEffect } from "react";
import Display from "./Display";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { motion } from "framer-motion";

interface HomePageProps {
  user: any;
  document?: any; // 📄 Selected document from sidebar
}

export default function HomePage({ user, document }: HomePageProps) {
  const supabase = createClientComponentClient();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (document) {
      setResult(document);
    }
  }, [document]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

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

  return (
    <main className="flex flex-col h-full bg-transparent p-6 text-white relative overflow-hidden">
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-500/70 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-500/70 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-80 h-80 bg-pink-500/70 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          width: result ? "100%" : "auto",
          height: result ? "100%" : "auto",
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className={`flex flex-col items-center justify-center text-center relative z-10 ${result ? 'h-full w-full' : 'h-full'}`}
      >
        {!result ? (
          <motion.div
            initial={{ y: "50%", translateY: "-50%", opacity: 0 }}
            animate={{
              y: "50%",
              translateY: "-50%",
              opacity: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center text-center h-full relative z-10"
          >
            <div className="bg-black/50 backdrop-filter backdrop-blur-lg rounded-2xl p-10 shadow-2xl border border-gray-700/30 max-w-lg w-full">
              <h1 className="text-4xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-600 drop-shadow-lg">
                PSM Ka BDSM Ai
              </h1>

              <form
                onSubmit={handleUpload}
                className="flex flex-col items-center gap-6"
              >
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer block w-full bg-gray-800/30 hover:bg-gray-700/30 transition-colors duration-300 rounded-lg p-5 border-2 border-dashed border-gray-600 text-gray-300 hover:text-white group"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {!selectedFile ? (
                      <>
                        <svg
                          className="w-10 h-10 text-gray-400 group-hover:text-blue-400 transition-colors duration-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          ></path>
                        </svg>
                        <span className="font-semibold text-lg">
                          Drag & Drop your file here or{" "}
                          <span className="text-blue-400 group-hover:underline">
                            Browse
                          </span>
                        </span>
                        <span className="text-sm text-gray-500">
                          Max file size: 10MB
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-lg text-blue-400">
                          {selectedFile.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    name="file"
                    required
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedFile || loading}
                >
                  {loading ? "Processing..." : "Upload File"}
                </button>
              </form>
            </div>
          </motion.div>
        ) : null}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            className="flex-1 overflow-y-auto w-full relative z-10"
          >
            <Display 
              data={result} 
              loading={loading} 
              documentImage={selectedFile ? URL.createObjectURL(selectedFile) : null}
            />
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
