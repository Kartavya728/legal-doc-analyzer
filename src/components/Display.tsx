"use client";

import { useState, useEffect } from "react";

export default function Display({ data }: { data: any }) {
  const [loadingStep, setLoadingStep] = useState("Analyzing...");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Only proceed if data is available and we haven't finished the animation
    if (!data || done) return;

    const steps = [
      "Analyzing...",
      "Thinking deeper...",
      "Extracting clauses...",
      "Defining category...",
      "Generating summary..."
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setLoadingStep(steps[i]);
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [data, done]); // Add done to dependency array to prevent re-running after completion

  if (!data) return null;

  // Render loading state if not done
  if (!done) {
    return (
      <div className="p-6 text-center text-gray-600">
        <p className="animate-pulse">{loadingStep}</p>
      </div>
    );
  }

  // Once done, render the actual data
  // Ensure data properties exist before rendering to avoid errors
  const summaryContent = data.summary || "No summary available.";
  const importantPointsList = data.important_points || [];
  const clausesList = data.clauses || [];

  return (
    <div className="p-6 space-y-6">
      {/* ✅ Summary */}
      <section>
        <h2 className="text-xl font-bold mb-2">📌 Summary</h2>
        <p className="text-blue-300">{summaryContent}</p>
      </section>

      {/* ✅ Important Points */}
      {importantPointsList.length > 0 && ( // Only render if there are important points
        <section>
          <h2 className="text-lg font-semibold mb-2">✨ Important Points</h2>
          <ul className="list-disc pl-6 text-cyan-200">
            {importantPointsList.map((point: string, idx: number) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ✅ Clauses */}
      <section>
        <h2 className="text-lg font-semibold mb-2">📑 Clauses</h2>
        <ul className="list-decimal pl-6 text-blue-300">
          {clausesList.map((clauseObj: any, idx: number) => (
            // Assuming each item in clausesList is an object with a 'clause' property
            <li key={idx}>{clauseObj.clause || "N/A"}</li>
          ))}
        </ul>
      </section>

      {/* ✅ Chat */}
      <section className="pt-4 border-t">
        <h2 className="text-lg font-semibold mb-2">💬 Ask the Document Bot</h2>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded shadow"
          onClick={() => alert("Chatbot feature coming soon!")}
        >
          Start Chat
        </button>
      </section>
    </div>
  );
}