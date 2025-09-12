"use client";

import { useState, useEffect, useRef } from "react";
import { Send, ExternalLink, AlertTriangle, CheckCircle, Info } from "lucide-react";

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

const CategoryIcon = ({ category }: { category: string }) => {
  const icons = {
    "Contracts & Agreements": "📋",
    "Litigation & Court Documents": "⚖️", 
    "Regulatory & Compliance": "📊",
    "Corporate Governance Documents": "🏢",
    "Property & Real Estate": "🏠",
    "Government & Administrative": "🏛️",
    "Personal Legal Documents": "📄"
  };
  return <span className="text-2xl">{icons[category as keyof typeof icons] || "📄"}</span>;
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 bg-amber-500 rounded-full animate-pulse"></div>
      </div>
    </div>
  </div>
);

export default function Display({
  data,
  loading,
}: {
  data: any;
  loading: boolean;
}) {
  const [loadingStep, setLoadingStep] = useState("Analyzing document...");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { sender: "user" | "bot"; text: string; timestamp: Date }[]
  >([]);
  const [isChatting, setIsChatting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Reset chat when document changes
  useEffect(() => {
    setChatHistory([]);
  }, [data]);

  // Enhanced loading animation
  useEffect(() => {
    if (!loading) return;

    const steps = [
      "🔍 Analyzing document structure...",
      "🧠 Classifying legal category...", 
      "📝 Generating title and summary...",
      "📋 Extracting important clauses...",
      "🔍 Searching related information...",
      "🎨 Creating visual layout...",
      "✅ Finalizing analysis..."
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setLoadingStep(steps[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [loading]);

  // Auto-scroll chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <LoadingSpinner />
          <div className="text-amber-100 text-lg font-medium animate-pulse">
            {loadingStep}
          </div>
          <div className="flex space-x-2 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const summaryObj = cleanJsonString(data?.summary);
  const category = data?.category || "Legal Document";
  const relatedInfo = data?.relatedInfo || [];

  const sendChat = async () => {
    if (!chatInput.trim() || isChatting) return;

    setIsChatting(true);
    setChatHistory((prev) => [...prev, { 
      sender: "user", 
      text: chatInput, 
      timestamp: new Date() 
    }]);

    const context = `
Category: ${category}
Summary: ${summaryObj?.summaryText || ''}
Important Points: ${summaryObj?.importantPoints?.join(", ") || ''}
Full Document: ${data?.content?.slice(0, 3000) || ''}
`;

    const messageToSend = chatInput;
    setChatInput("");

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          context,
        }),
      });

      const result = await res.json();
      setChatHistory((prev) => [
        ...prev,
        { 
          sender: "bot", 
          text: result.reply || "I couldn't process that request.", 
          timestamp: new Date() 
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { 
          sender: "bot", 
          text: "⚠️ Sorry, I'm having trouble connecting right now.", 
          timestamp: new Date() 
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <CategoryIcon category={category} />
            <div>
              <h1 className="text-2xl font-bold text-amber-100">{data.title}</h1>
              <p className="text-amber-200/70">{category}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Summary Card */}
        {summaryObj?.summaryText && (
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl p-6 border border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Info className="text-blue-400" size={24} />
              <h2 className="text-xl font-semibold text-amber-100">Executive Summary</h2>
            </div>
            <p className="text-amber-50 leading-relaxed text-lg">
              {summaryObj.summaryText}
            </p>
          </div>
        )}

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Important Points */}
          {summaryObj?.importantPoints?.length > 0 && (
            <div className="bg-black/40 rounded-2xl p-6 border border-green-500/20">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="text-green-400" size={24} />
                <h2 className="text-xl font-semibold text-amber-100">Key Points</h2>
              </div>
              <div className="space-y-3">
                {summaryObj.importantPoints.map((point: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-amber-50">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks & Consequences */}
          {(summaryObj?.mainRisksRightsConsequences || summaryObj?.whatHappensIfYouIgnoreThis) && (
            <div className="bg-black/40 rounded-2xl p-6 border border-red-500/20">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-400" size={24} />
                <h2 className="text-xl font-semibold text-amber-100">Risks & Consequences</h2>
              </div>
              <div className="space-y-4">
                {summaryObj.mainRisksRightsConsequences && (
                  <div>
                    <h3 className="font-medium text-red-300 mb-2">Legal Implications</h3>
                    <p className="text-amber-50">{summaryObj.mainRisksRightsConsequences}</p>
                  </div>
                )}
                {summaryObj.whatHappensIfYouIgnoreThis && (
                  <div>
                    <h3 className="font-medium text-red-300 mb-2">If You Ignore This</h3>
                    <p className="text-amber-50">{summaryObj.whatHappensIfYouIgnoreThis}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Items */}
        {summaryObj?.whatYouShouldDoNow?.length > 0 && (
          <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-2xl p-6 border border-amber-500/20">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="text-amber-400" size={24} />
              <h2 className="text-xl font-semibold text-amber-100">Immediate Actions Required</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summaryObj.whatYouShouldDoNow.map((action: string, idx: number) => (
                <div key={idx} className="bg-black/30 rounded-lg p-4 border border-amber-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <p className="text-amber-50">{action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clauses Section */}
        {data?.clauses?.length > 0 && (
          <div className="bg-black/40 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">📑</span>
              <h2 className="text-xl font-semibold text-amber-100">Important Clauses</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.clauses.map((clauseObj: any, idx: number) => (
                <div key={idx} className="bg-black/30 rounded-xl p-5 border border-purple-500/10">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full mt-1 ${
                      clauseObj.importance === 'high' ? 'bg-red-400' :
                      clauseObj.importance === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <h3 className="font-semibold text-amber-100 flex-1">
                      {clauseObj.clause || `Clause ${idx + 1}`}
                    </h3>
                  </div>
                  
                  {clauseObj.explanation?.Explanation && (
                    <div className="mb-3">
                      <p className="text-amber-50/90 text-sm leading-relaxed">
                        {clauseObj.explanation.Explanation}
                      </p>
                    </div>
                  )}
                  
                  {clauseObj.explanation?.PunishmentDetails && (
                    <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/20">
                      <p className="text-red-200 text-sm">
                        <span className="font-medium">Penalties: </span>
                        {clauseObj.explanation.PunishmentDetails}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Information */}
        {relatedInfo.length > 0 && (
          <div className="bg-black/40 rounded-2xl p-6 border border-blue-500/20">
            <div className="flex items-center gap-3 mb-6">
              <ExternalLink className="text-blue-400" size={24} />
              <h2 className="text-xl font-semibold text-amber-100">Related Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedInfo.slice(0, 6).map((info: any, idx: number) => (
                <a
                  key={idx}
                  href={info.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black/30 rounded-lg p-4 border border-blue-500/10 hover:border-blue-400/30 transition-colors group"
                >
                  <h3 className="font-medium text-blue-300 group-hover:text-blue-200 mb-2 line-clamp-2">
                    {info.title}
                  </h3>
                  <p className="text-amber-50/70 text-sm line-clamp-3">
                    {info.snippet}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-blue-400">
                    <ExternalLink size={14} />
                    <span className="text-xs">Learn more</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Important Note */}
        {summaryObj?.importantNote && (
          <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 rounded-2xl p-6 border border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-400" size={24} />
              <h2 className="text-xl font-semibold text-red-200">⚠️ Critical Notice</h2>
            </div>
            <p className="text-red-100 font-medium text-lg">
              {summaryObj.importantNote}
            </p>
          </div>
        )}

        {/* Chat Section */}
        <div className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <h2 className="text-xl font-semibold text-amber-100">Ask Questions</h2>
            </div>
          </div>

          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-amber-50/50 py-8">
                <p>Ask me anything about this document...</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {[
                    "What are the key risks?",
                    "Explain the main clauses",
                    "What should I do next?",
                    "Are there any deadlines?"
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setChatInput(suggestion)}
                      className="px-3 py-1 bg-amber-500/20 text-amber-200 rounded-full text-sm hover:bg-amber-500/30 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        msg.sender === "user"
                          ? "bg-amber-500 text-black rounded-br-md"
                          : "bg-gray-700 text-white rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex space-x-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-2 h-2 bg-white rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-6 border-t border-white/10 bg-black/20">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Ask about clauses, risks, next steps..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                className="flex-1 bg-white/5 border border-white/20 rounded-full px-4 py-3 text-amber-50 placeholder-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                disabled={isChatting}
              />
              <button
                onClick={sendChat}
                disabled={!chatInput.trim() || isChatting}
                className="p-3 bg-amber-500 text-black rounded-full hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}