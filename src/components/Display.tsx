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
  const [chatResponse, setChatResponse] = useState("");

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

  // ✅ Clean summary JSON
  const summaryObj = cleanJsonString(data?.summary);

  const category = data?.category || "Uncategorized Document";
  const summaryText = summaryObj?.summaryText || "";
  const importantPoints = summaryObj?.importantPoints || [];
  const whatHappensIfYouIgnoreThis =
    summaryObj?.whatHappensIfYouIgnoreThis || "";
  const whatYouShouldDoNow = summaryObj?.whatYouShouldDoNow || [];
  const importantNote = summaryObj?.importantNote || "";
  const mainRisksRightsConsequences =
    summaryObj?.mainRisksRightsConsequences || "";

  const clausesList = (data?.clauses || []).map((clauseObj: any) => ({
    ...clauseObj,
    attributes: cleanJsonString(clauseObj.attributes),
    explanation: cleanJsonString(clauseObj.explanation),
  }));

  // ✅ Chat function
  const sendChat = async () => {
    if (!chatInput.trim()) return;

    // Build context from analyzed document data
    const context = `
Category: ${category}
Summary: ${summaryText}
Important Points: ${importantPoints.join(", ")}
Risks/Consequences: ${mainRisksRightsConsequences}
What Happens If Ignored: ${whatHappensIfYouIgnoreThis}
What You Should Do: ${whatYouShouldDoNow.join(", ")}
Important Note: ${importantNote}
Full Text: ${data?.content?.slice(0, 2000) || ""}
`;

    console.log("Sending to chatbot:", { message: chatInput, context });

    const res = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: chatInput, // ✅ required
        context: context, // ✅ required
      }),
    });

    const result = await res.json();
    console.log("💬 Chatbot Response:", result);
    setChatResponse(result.reply || "No response");
  };

  if (loading && !done) {
    return (
      <div className="p-6 text-center text-amber-50 bg-slate-950 min-h-screen">
        <p className="animate-pulse">{loadingStep}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-amber-50">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* 📂 Category */}
        <section className="p-4 bg-black/40 rounded-lg border border-white/20">
          <h2 className="text-xl font-bold mb-2">📂 Category</h2>
          <p>{category}</p>
        </section>

        {/* 📌 Summary */}
        {summaryText && (
          <section className="p-4 bg-black/40 rounded-lg border border-white/20">
            <h2 className="text-xl font-bold mb-3">📌 Summary</h2>
            <p className="leading-relaxed whitespace-pre-line">{summaryText}</p>
          </section>
        )}

        {/* ✨ Important Points */}
        {importantPoints.length > 0 && (
          <section className="p-4 bg-black/40 rounded-lg border border-white/20">
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
          <section className="p-4 bg-black/40 rounded-lg border border-white/20">
            <h2 className="text-lg font-semibold mb-3">
              ⚠️ What Happens If You Ignore This
            </h2>
            <p>{whatHappensIfYouIgnoreThis}</p>
          </section>
        )}

        {/* ✅ What You Should Do Now */}
        {whatYouShouldDoNow.length > 0 && (
          <section className="p-4 bg-black/40 rounded-lg border border-white/20">
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
          <section className="p-4 bg-black/40 rounded-lg border border-white/20">
            <h2 className="text-lg font-semibold mb-3">📑 Clauses</h2>
            <div className="space-y-4">
              {clausesList.map((clauseObj: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 bg-black/40 rounded-lg border border-white/20"
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
          <section className="p-4 bg-black/40 rounded-lg border border-white/20">
            <h2 className="text-lg font-semibold mb-3">
              📌 Main Risks, Rights & Consequences
            </h2>
            <p>{mainRisksRightsConsequences}</p>
          </section>
        )}

        {/* 📝 Important Note */}
        {importantNote && (
          <section className="p-4 bg-black/40 rounded-lg border border-white/20">
            <h2 className="text-lg font-semibold mb-3">📝 Important Note</h2>
            <p>{importantNote}</p>
          </section>
        )}

        {/* 💬 Chatbot response */}
        {chatResponse && (
          <section className="p-4 bg-amber-100 text-black rounded-lg border border-white/20">
            <h2 className="text-lg font-semibold mb-2">💬 Chatbot</h2>
            <p>{chatResponse}</p>
          </section>
        )}
      </div>

      {/* 💬 Chat input bar */}
      <div className="border-t border-white/20 p-4 bg-black/40 sticky bottom-0 flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask something about this document..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendChat();
            }
          }}
          className="flex-1 border border-white/30 bg-transparent text-amber-50 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={sendChat}
          className="p-2 bg-amber-500 text-black rounded-full hover:bg-amber-400"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
