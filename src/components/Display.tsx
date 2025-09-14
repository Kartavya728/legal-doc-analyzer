"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  Calendar,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

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
   Online Resource Card
-------------------------------- */
const OnlineResourceCard = ({
  title,
  description,
  url,
  source,
}: {
  title: string;
  description?: string;
  url: string;
  source: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/30 rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all group"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-amber-100">{title}</h3>
          <span className="bg-blue-900/30 text-blue-200 text-xs px-2 py-1 rounded-full">
            {source}
          </span>
        </div>
        {description && (
          <p className="text-amber-50/70 text-sm mb-3">{description}</p>
        )}
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-blue-300 hover:text-blue-200 transition-colors"
        >
          <ExternalLink size={14} className="mr-1" />
          Visit Resource
        </a>
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
  const [selectedView, setSelectedView] = useState<string>("summary");
  const [selectedClause, setSelectedClause] = useState<string>("");

  // Extract summary object
  const summaryObj = data?.summary ? cleanJsonString(data.summary) : {};
  const category = data?.category || "Legal Document";
  const documentType =
    data?.documentType || data?.data?.documentType || "Unknown Document";
    
  // Function to determine which UI components to show based on document category
  // (Implementation moved below)

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
     Get UI Components Based on Category (Implementation)
  -------------------------------- */
  const getCategorySpecificUI = (category: string) => {
    switch (category) {
      case "Contracts & Agreements":
        return {
          showTable: true,
          showTimeline: true,
          showGrid: false,
          showDropdown: true,
        };
      case "Litigation & Court Documents":
        return {
          showTable: true,
          showTimeline: true,
          showGrid: true,
          showDropdown: false,
        };
      case "Regulatory & Compliance":
        return {
          showTable: true,
          showTimeline: false,
          showGrid: true,
          showDropdown: true,
        };
      case "Corporate Governance Documents":
        return {
          showTable: true,
          showTimeline: false,
          showGrid: true,
          showDropdown: true,
        };
      case "Property & Real Estate":
        return {
          showTable: false,
          showTimeline: false,
          showGrid: true,
          showDropdown: true,
        };
      default:
        return {
          showTable: false,
          showTimeline: false,
          showGrid: false,
          showDropdown: false,
        };
    }
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

  /* -------------------------------
     Handle Chat Submission
  -------------------------------- */
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // Add user message to chat history
    const userMessage = {
      sender: "user" as const,
      text: chatInput,
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatting(true);

    try {
      // Prepare context from document data
      const context = JSON.stringify({
        category,
        documentType,
        summary: summaryObj,
      });

      // Call the chatbot API
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          context,
          documentType,
          category,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      setStreamingMessage("");
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        setStreamingMessage((prev) => prev + text);
      }

      // Add bot message to chat history once streaming is complete
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "bot" as const,
          text: streamingMessage,
          timestamp: new Date(),
        },
      ]);
      setStreamingMessage("");
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "bot" as const,
          text: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Get UI components based on document category
  const uiComponents = getCategorySpecificUI(category);
  
  // Generate sample data for UI components based on document content
  const generateSampleData = () => {
    // Generate grid items
    const gridItems = [
      {
        title: "Document Type",
        content: documentType,
        icon: "📄"
      },
      {
        title: "Category",
        content: category,
        icon: "📁"
      },
      {
        title: "Date",
        content: new Date().toLocaleDateString(),
        icon: "📅"
      }
    ];
    
    // Add more grid items based on summary object
    if (summaryObj.parties) {
      gridItems.push({
        title: "Parties",
        content: typeof summaryObj.parties === 'string' ? summaryObj.parties : "Multiple parties involved",
        icon: "👥"
      });
    }
    
    if (summaryObj.effectiveDate) {
      gridItems.push({
        title: "Effective Date",
        content: summaryObj.effectiveDate,
        icon: "📆"
      });
    }
    
    // Generate table data
    const tableHeaders = ["Clause", "Description", "Status", "Risk Level"];
    const tableRows = [
      ["Termination", "Contract can be terminated with 30 days notice", "Active", "Low"],
      ["Payment Terms", "Net 30 days from invoice date", "Active", "Medium"],
      ["Confidentiality", "Information must be kept confidential for 5 years", "Active", "High"],
      ["Indemnification", "Each party indemnifies the other for third-party claims", "Active", "Medium"],
      ["Governing Law", "Laws of the State of California", "Active", "Low"]
    ];
    
    // Generate timeline events
    const timelineEvents = [
      {
        date: "Jan 15, 2025",
        title: "Document Created",
        description: "Initial draft of the document was created",
        status: "completed"
      },
      {
        date: "Feb 1, 2025",
        title: "Document Signed",
        description: "All parties signed the document",
        status: "completed"
      },
      {
        date: "Feb 15, 2025",
        title: "Effective Date",
        description: "Document became legally binding",
        status: "completed"
      },
      {
        date: "Jan 31, 2026",
        title: "Annual Review",
        description: "Scheduled review of terms and conditions",
        status: "upcoming"
      },
      {
        date: "Feb 15, 2027",
        title: "Expiration",
        description: "Document expires unless renewed",
        status: "upcoming"
      }
    ];
    
    // Generate dropdown options
    const dropdownOptions = [
      { label: "Summary View", value: "summary", icon: "📝" },
      { label: "Detailed Analysis", value: "detailed", icon: "🔍" },
      { label: "Risk Assessment", value: "risks", icon: "⚠️" },
      { label: "Key Clauses", value: "clauses", icon: "📋" },
    ];
    
    return { gridItems, tableHeaders, tableRows, timelineEvents, dropdownOptions };
  };
  
  const { gridItems, tableHeaders, tableRows, timelineEvents, dropdownOptions } = generateSampleData();

  return (
    <div className="min-h-screen w-full text-white">
      {/* Document Analysis Display */}
      <div className="container mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Document Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <CategoryIcon category={category} />
                <div>
                  <h1 className="text-2xl font-bold">{documentType}</h1>
                  <p className="text-gray-400">{category}</p>
                </div>
              </div>
              
              {/* View Selector Dropdown */}
              {uiComponents.showDropdown && (
                <div className="w-full md:w-64">
                  <DocumentDropdown
                    options={dropdownOptions}
                    value={selectedView}
                    onChange={setSelectedView}
                    label="Select View"
                  />
                </div>
              )}
            </div>
            
            {/* Document Sections */}
            <div className="space-y-6">
              {/* Summary Section */}
              {visibleSections.has("summary") && (
                <>
                  {/* Display AI-generated summary model if available */}
                  {data?.models?.find(model => model.type === 'summary') ? (
                    <DocumentSummary 
                      summaryText={data.models.find(model => model.type === 'summary').data.summaryText}
                      documentType={data.models.find(model => model.type === 'summary').data.documentType}
                      wordCount={data.models.find(model => model.type === 'summary').data.wordCount}
                      readingTime={data.models.find(model => model.type === 'summary').data.readingTime}
                    />
                  ) : summaryObj.summary ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-800/50 p-4 rounded-lg border border-gray-700"
                    >
                      <h2 className="text-xl font-semibold mb-2">Summary</h2>
                      <p className="text-gray-300">{summaryObj.summary}</p>
                    </motion.div>
                  ) : null}
                </>
              )}
              
              {/* Grid Layout for Document Info */}
              {uiComponents.showGrid && visibleSections.has("summary") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-xl font-semibold mb-4">Document Information</h2>
                  <DocumentGrid items={gridItems} />
                </motion.div>
              )}
              
              {/* Key Points Section */}
              {visibleSections.has("keyPoints") && summaryObj.keyPoints && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 p-4 rounded-lg border border-gray-700"
                >
                  <h2 className="text-xl font-semibold mb-2">Key Points</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    {Array.isArray(summaryObj.keyPoints) ? 
                      summaryObj.keyPoints.map((point: string, i: number) => (
                        <li key={i} className="text-gray-300">{point}</li>
                      )) : 
                      <li className="text-gray-300">{summaryObj.keyPoints}</li>
                    }
                  </ul>
                </motion.div>
              )}
              
              {/* Table for Clauses */}
              {uiComponents.showTable && visibleSections.has("keyPoints") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <DocumentTable 
                    headers={tableHeaders} 
                    rows={tableRows} 
                    title="Document Clauses" 
                  />
                </motion.div>
              )}
              
              {/* Online Resources Section */}
              {visibleSections.has("keyPoints") && data?.models?.some(model => model.type === 'link') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-xl font-semibold mb-4">Online Resources</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.models
                      .filter(model => model.type === 'link')
                      .map((model, index) => (
                        <OnlineResourceCard
                          key={index}
                          title={model.title}
                          description={model.description}
                          url={model.data.url}
                          source={model.data.source}
                        />
                      ))}
                  </div>
                </motion.div>
              )}
              
              {/* Timeline for Document Events */}
              {uiComponents.showTimeline && visibleSections.has("keyPoints") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8"
                >
                  <DocumentTimeline 
                    events={timelineEvents} 
                    title="Document Timeline" 
                  />
                </motion.div>
              )}
              
              {/* Risks Section */}
              {visibleSections.has("risks") && summaryObj.risks && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 p-4 rounded-lg border border-gray-700"
                >
                  <h2 className="text-xl font-semibold mb-2 flex items-center">
                    <AlertTriangle className="mr-2 text-amber-500" size={18} />
                    Risks
                  </h2>
                  <p className="text-gray-300">{summaryObj.risks}</p>
                </motion.div>
              )}
            </div>
            
            {/* Chat Interface */}
            <div className="mt-8 bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold">Ask about this document</h2>
              </div>
              
              {/* Chat Messages */}
              <div className="h-64 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 ? (
                  <p className="text-gray-500 text-center">Ask a question about this document</p>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${msg.sender === "user" ? "bg-blue-600" : "bg-gray-700"}`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Streaming Message */}
                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-lg bg-gray-700">
                      <p className="text-sm">
                        <StreamingText text={streamingMessage} />
                      </p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* Chat Input */}
              <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-700 flex">
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
                  disabled={!chatInput.trim()}
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
