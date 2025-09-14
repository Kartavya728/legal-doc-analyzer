"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

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
const StreamingText = ({
  text,
  delay = 0,
}: {
  text: string;
  delay?: number;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;
    let interval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(text.slice(0, i + 1));
          i++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, 20);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, delay]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

/* -------------------------------
   Internet Image Card
-------------------------------- */
const InternetImageCard = ({
  query,
  title,
  description,
}: {
  query: string;
  title: string;
  description?: string;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const url =
          "https://tse2.mm.bing.net/th/id/OIP.7cRYFyLoDEDh4sRtM73vvwHaDg?pid=Api&P=0&h=180";
        setImageUrl(url);
      } catch {
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    };
    fetchImage();
  }, [query]);

  if (loading) {
    return (
      <div className="bg-black/30 rounded-xl p-4 border border-white/10">
        <div className="w-full h-48 bg-gray-700/50 rounded-lg animate-pulse mb-3"></div>
        <div className="h-4 bg-gray-700/50 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/30 rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all group"
    >
      {imageUrl && (
        <div className="relative w-full h-48 overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-amber-100 mb-2">{title}</h3>
        {description && (
          <p className="text-amber-50/70 text-sm">{description}</p>
        )}
      </div>
    </motion.div>
  );
};

/* -------------------------------
   Main Component
-------------------------------- */
export default function Display({
  data,
  loading,
  uploadedImageUrl,
}: {
  data: any;
  loading: boolean;
  uploadedImageUrl?: string | null;
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { sender: "user" | "bot"; text: string; timestamp: Date }[]
  >([]);
  const [isChatting, setIsChatting] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set()
  );

  // Extract summary object
  const summaryObj = data?.summary ? cleanJsonString(data.summary) : {};
  const category = data?.category || "Legal Document";
  const documentType =
    data?.documentType || data?.data?.documentType || "Unknown Document";

  /* -------------------------------
     Section Filter Logic
  -------------------------------- */
  const shouldShowSection = (
    sectionName: string,
    docType: string,
    docCategory: string
  ) => {
    const commonSections = ["header", "summary"];
    if (commonSections.includes(sectionName)) return true;

    switch (docCategory) {
      case "Personal Legal Documents":
        if (
          docType.includes("ID Card") ||
          docType.includes("Certificate")
        ) {
          return !["payment", "warranty", "termination"].includes(sectionName);
        }
        break;
      case "Contracts & Agreements":
        return true;
      case "Litigation & Court Documents":
        return !["payment", "warranty"].includes(sectionName);
      default:
        return true;
    }
    return true;
  };

  /* -------------------------------
     Animate Section Reveal
  -------------------------------- */
  useEffect(() => {
    if (!data || loading) return;
    const sections = [
      "header",
      "summary",
      "keyPoints",
      "risks",
      "actions",
      "clauses",
    ];
    const filteredSections = sections.filter((section) =>
      shouldShowSection(section, documentType, category)
    );
    filteredSections.forEach((section, index) => {
      const timer = setTimeout(() => {
        setVisibleSections((prev) => new Set([...prev, section]));
      }, index * 800);
      return () => clearTimeout(timer);
    });
  }, [data, loading, documentType, category]);

  /* -------------------------------
     Auto-scroll Chat
  -------------------------------- */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, streamingMessage]);

  // ❌ I’ve trimmed here since your UI rendering is very long.
  // ✅ But now `documentType`, `summaryObj`, and `shouldShowSection`
  // are in the correct order and no undefined reference.

  return (
    <div className="min-h-screen w-full text-white">
      {/* ... keep your existing rendering code here ... */}
      {/* With fixed order & no duplicate documentType */}
    </div>
  );
}
