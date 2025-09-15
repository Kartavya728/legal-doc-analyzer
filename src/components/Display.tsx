"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { Send, ExternalLink, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

// Import custom UI components
import DocumentGrid from "./ui/document-grid";
import DocumentTable from "./ui/document-table";
import DocumentTimeline from "./ui/document-timeline";
import DocumentDropdown from "./ui/document-dropdown";
import DocumentSummary from "./ui/document-summary";

/* -------------------------------
   Utility: Clean JSON Safely
-------------------------------- */
function cleanJsonString(input: any): any {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      if (input.trim().startsWith("Document") || !input.includes("{")) {
        return input.trim();
      }
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

/* -------------------------------
   Category Icons
-------------------------------- */
const CategoryIcon = ({ category }: { category: string }) => {
  const icons = {
    "Contracts & Agreements": "📋",
    "Litigation & Court Documents": "⚖️",
    "Regulatory & Compliance": "📊",
    "Corporate Governance Documents": "🏢",
    "Property & Real Estate": "🏠",
    "Government & Administrative": "🏛️",
    "Personal Legal Documents": "📄",
  };
  return (
    <span className="text-3xl">
      {icons[category as keyof typeof icons] || "📄"}
    </span>
  );
};

/* -------------------------------
   Streaming Text Effect
-------------------------------- */
const StreamingText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

/* -------------------------------
   Main Component
-------------------------------- */
export default function Display({
  data,
  loading,
  uploadedImageUrl,
  children, // ✅ dynamic children support
}: {
  data: any;
  loading: boolean;
  uploadedImageUrl?: string | null;
  children?: ReactNode; // ✅ accept any React children
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { sender: "user" | "bot"; text: string; timestamp: Date }[]
  >([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const summaryObj = data?.summary ? cleanJsonString(data.summary) : {};
  const category = data?.category || "Legal Document";
  const documentType =
    data?.documentType || data?.data?.documentType || "Unknown Document";

  // Example: generate some UI data
  const gridItems = [
    { title: "Document Type", content: documentType, icon: "📄" },
    { title: "Category", content: category, icon: "📁" },
    { title: "Date", content: new Date().toLocaleDateString(), icon: "📅" },
  ];

  /* -------------------------------
     Auto-scroll Chat
  -------------------------------- */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, streamingMessage]);

  return (
    <div className="min-h-screen w-full text-white">
      <div className="container mx-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            {streamingStatus && (
              <div className="text-center">
                <p className="text-lg font-medium">{streamingStatus}</p>
                <div className="w-64 bg-gray-700 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${streamingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center space-x-4">
              <CategoryIcon category={category} />
              <div>
                <h1 className="text-2xl font-bold">{documentType}</h1>
                <p className="text-gray-400">{category}</p>
              </div>
            </div>

            {/* Default Sections */}
            {summaryObj.summary && (
              <DocumentSummary
                summaryText={summaryObj.summary}
                documentType={documentType}
                wordCount={summaryObj.wordCount || 0}
                readingTime={summaryObj.readingTime || "1 min"}
              />
            )}

            <DocumentGrid items={gridItems} />

            {/* ✅ Custom children injected dynamically */}
            {children && <div className="space-y-6">{children}</div>}

            {/* Chat */}
            <div className="mt-8 bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold">Ask about this document</h2>
              </div>
              <div className="h-64 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.sender === "user" ? "bg-blue-600" : "bg-gray-700"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-lg bg-gray-700">
                      <StreamingText text={streamingMessage} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <form className="p-4 border-t border-gray-700 flex">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 bg-gray-700 text-white rounded-l-lg px-4 py-2 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 rounded-r-lg px-4 py-2 flex items-center justify-center"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
