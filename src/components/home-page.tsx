"use client";

import { useState, useEffect } from "react";
import Display from "./Display";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { motion } from "motion/react";

interface HomePageProps {
  user: any;
  document?: any; // 📄 Selected document from sidebar
}

export default function HomePage({ user, document }: HomePageProps) {
  const supabase = createClientComponentClient();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 🔹 When sidebar selects a document → update display
  useEffect(() => {
    if (document) {
      setResult(document);
    }
  }, [document]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

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
        setResult(data.result); // ✅ Upload result shown in Display
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error("Frontend upload error:", err);
    }

    setLoading(false);
  };

  return (
    <main className="flex flex-col h-full bg-transparent p-6 text-white">
      {!result && (
        <motion.div
          initial={{ y: "50%", translateY: "-50%", opacity: 0 }}
          animate={{
            y: "50%",
            translateY: "-50%",
            opacity: 1,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="flex flex-col items-center justify-center text-center h-full"
        >
          <h1 className="text-3xl font-bold mb-6">PSM Ka BDSM Ai</h1>

          <form
            onSubmit={handleUpload}
            className="flex flex-col items-center gap-4"
          >
            <input
              type="file"
              name="file"
              required
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 
                       file:rounded-lg file:border-0 
                       file:text-sm file:font-semibold
                       file:bg-blue-900 file:text-white 
                       hover:file:bg-blue-700"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-800 hover:bg-blue-600 text-white rounded-lg"
            >
              {loading ? "Processing..." : "Upload"}
            </button>
          </form>
        </motion.div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full"
        >
          <Display data={result} loading={loading} />
        </motion.div>
      )}
    </main>
  );
}
