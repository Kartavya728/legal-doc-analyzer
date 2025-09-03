"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";

// 🧹 JSON cleaner: removes ```json wrappers & parses safely
function cleanJsonString(input: any): any {
  if (typeof input === "string") {
    try {
      const cleaned = input.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return input.trim();
    }
  } else if (Array.isArray(input)) {
    return input.map((el) => cleanJsonString(el));
  } else if (typeof input === "object" && input !== null) {
    const cleanedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      cleanedObj[key] = cleanJsonString(value);
    }
    return cleanedObj;
  }
  return input;
}

export default function Display({
  data,
  loading,
}: {
  data: any;
  loading: boolean;
}) {
  const [loadingStep, setLoadingStep] = useState("Analyzing...");
  const [done, setDone] = useState(false);
  const [chatInput, setChatInput] = useState("");

  // Animate loading
  useEffect(() => {
    if (!loading) return;
    setDone(false);

    const steps = [
      "Analyzing...",
      "Thinking deeper...",
      "Extracting clauses...",
      "Defining category...",
      "Generating summary...",
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setLoadingStep(steps[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (data) setDone(true);
  }, [data]);

  if (loading && !done) {
    return (
      <div className="p-6 text-center text-amber-50 bg-slate-950 min-h-screen">
        <p className="animate-pulse">{loadingStep}</p>
      </div>
    );
  }

  if (!data) return null;

  // ✅ Clean summary JSON
  const summaryObj = cleanJsonString(data.summary);

  const category = data.category || "Uncategorized Document";
  const summaryText = summaryObj?.summaryText || "";
  const importantPoints = summaryObj?.importantPoints || [];
  const whatHappensIfYouIgnoreThis =
    summaryObj?.whatHappensIfYouIgnoreThis || "";
  const whatYouShouldDoNow = summaryObj?.whatYouShouldDoNow || [];
  const importantNote = summaryObj?.importantNote || "";
  const mainRisksRightsConsequences =
    summaryObj?.mainRisksRightsConsequences || "";

  const clausesList = (data.clauses || []).map((clauseObj: any) => ({
    ...clauseObj,
    attributes: cleanJsonString(clauseObj.attributes),
    explanation: cleanJsonString(clauseObj.explanation),
  }));

  return (
   <div className="flex flex-col min-h-screen bg-transparent text-amber-50">
  <div className="flex-1 p-6 space-y-6 overflow-y-auto">
    {/* 📂 Category */}
    <section>
      <h2 className="text-xl font-bold mb-2">📂 Category</h2>
      <p>{category}</p>
    </section>

    {/* 📌 Summary */}
    {summaryText && (
      <section>
        <h2 className="text-xl font-bold mb-3">📌 Summary</h2>
        <p className="leading-relaxed whitespace-pre-line">{summaryText}</p>
      </section>
    )}

    {/* ✨ Important Points */}
    {importantPoints.length > 0 && (
      <section>
        <h2 className="text-lg font-semibold mb-3">✨ Important Points</h2>
        <ul className="list-disc pl-6 space-y-1">
          {importantPoints.map((point: string, idx: number) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
      </section>
    )}

    {/* ⚠️ What Happens If You Ignore This */}
    {whatHappensIfYouIgnoreThis && (
      <section>
        <h2 className="text-lg font-semibold mb-3">
          ⚠️ What Happens If You Ignore This
        </h2>
        <p>{whatHappensIfYouIgnoreThis}</p>
      </section>
    )}

    {/* ✅ What You Should Do Now */}
    {whatYouShouldDoNow.length > 0 && (
      <section>
        <h2 className="text-lg font-semibold mb-3">
          ✅ What You Should Do Now
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          {whatYouShouldDoNow.map((point: string, idx: number) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
      </section>
    )}

    {/* 📑 Clauses */}
    {clausesList.length > 0 && (
      <section>
        <h2 className="text-lg font-semibold mb-3">📑 Clauses</h2>
        <div className="space-y-4">
          {clausesList.map((clauseObj: any, idx: number) => (
            <div
              key={idx}
              className="p-4 border border-amber-200/20 rounded-lg bg-transparent shadow-sm"
            >
              <p className="font-medium mb-2">
                {clauseObj.clause || "N/A"}
              </p>
              {clauseObj.explanation?.Explanation && (
                <p className="text-sm">
                  <span className="font-semibold">Explanation: </span>
                  {clauseObj.explanation.Explanation}
                </p>
              )}
              {clauseObj.explanation?.PunishmentDetails && (
                <p className="text-sm mt-1">
                  <span className="font-semibold">Punishment: </span>
                  {clauseObj.explanation.PunishmentDetails}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    )}

    {/* 📌 Main Risks, Rights & Consequences */}
    {mainRisksRightsConsequences && (
      <section>
        <h2 className="text-lg font-semibold mb-3">
          📌 Main Risks, Rights & Consequences
        </h2>
        <p>{mainRisksRightsConsequences}</p>
      </section>
    )}

    {/* 📝 Important Note */}
    {importantNote && (
      <section>
        <h2 className="text-lg font-semibold mb-3">📝 Important Note</h2>
        <p>{importantNote}</p>
      </section>
    )}
  </div>

  {/* 💬 Chat input bar */}
  <div className="border-t border-amber-200/20 p-4 bg-transparent sticky bottom-0 flex items-center gap-2">
    <input
      type="text"
      placeholder="Ask something about this document..."
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          console.log("Send:", chatInput);
          setChatInput("");
        }
      }}
      className="flex-1 border border-amber-200/30 bg-transparent text-amber-50 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
    />
    <button
      onClick={() => {
        console.log("Send:", chatInput);
        setChatInput("");
      }}
      className="p-2 bg-amber-500 text-black rounded-full hover:bg-amber-400"
    >
      <Send size={18} />
    </button>
  </div>
</div>

  );
}
