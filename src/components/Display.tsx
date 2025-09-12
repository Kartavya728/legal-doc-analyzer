"use client";

import { useState, useEffect, useRef } from "react";
import { Send, ExternalLink, AlertTriangle, CheckCircle, Info, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

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
  return <span className="text-3xl">{icons[category as keyof typeof icons] || "📄"}</span>;
};

const StreamingText = ({ text, delay = 0 }: { text: string, delay?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;
    
    const timeout = setTimeout(() => {
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
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

const InternetImageCard = ({ query, title, description }: { query: string, title: string, description?: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const searchTerm = encodeURIComponent(query.slice(0, 50));
        const url = `https://source.unsplash.com/800x400/?${searchTerm}`;
        setImageUrl(url);

        // ✅ Print image URL
        console.log(`[InternetImageCard] Image for "${query}": ${url}`);
      } catch (error) {
        console.error('Failed to fetch image:', error);
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
      {/* Log the image URL */}
      {console.log("Image URL:", imageUrl)}

      <Image
        src={imageUrl}
        alt={title + " kartavya"}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
    </div>
  )}
  <div className="p-4">
    <h3 className="font-semibold text-amber-100 mb-2">{title}</h3>
    {description && <p className="text-amber-50/70 text-sm">{description}</p>}
  </div>
</motion.div>

  );
};


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
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  // Reset chat when document changes
  useEffect(() => {
    setChatHistory([]);
    setVisibleSections(new Set());
  }, [data]);

  // Simulate section visibility based on content generation
  useEffect(() => {
    if (!data || loading) return;

    const sections = ['header', 'summary', 'keyPoints', 'risks', 'actions', 'clauses'];
    sections.forEach((section, index) => {
      setTimeout(() => {
        setVisibleSections(prev => new Set([...prev, section]));
      }, index * 800);
    });
  }, [data, loading]);

  // Auto-scroll chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, streamingMessage]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-amber-200/30 border-t-amber-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-amber-500/50 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-amber-100 text-lg font-medium">
            <StreamingText text="Analyzing your document with AI..." />
          </div>
        </motion.div>
      </div>
    );
  }

  const summaryObj = cleanJsonString(data?.summary);
  const category = data?.category || "Legal Document";

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
    setStreamingMessage("");

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          context,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;
        setStreamingMessage(fullResponse);
      }

      setChatHistory((prev) => [
        ...prev,
        { 
          sender: "bot", 
          text: fullResponse || "I couldn't process that request.", 
          timestamp: new Date() 
        },
      ]);
      setStreamingMessage("");
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { 
          sender: "bot", 
          text: "⚠️ Sorry, I'm having trouble connecting right now.", 
          timestamp: new Date() 
        },
      ]);
      setStreamingMessage("");
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="min-h-screen w-full">
      {/* Uploaded Document Image */}
      {uploadedImageUrl && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10"
        >
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img 
                  src={uploadedImageUrl} 
                  alt="Uploaded document" 
                  className="w-20 h-20 object-cover rounded-lg border border-white/20"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full flex items-center justify-center">
                  <FileText size={12} className="text-white" />
                </div>
              </div>
              <div className="flex-1">
                {visibleSections.has('header') && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <CategoryIcon category={category} />
                      <h1 className="text-3xl font-bold text-amber-100">
                        <StreamingText text={data.title || "Document Analysis"} delay={300} />
                      </h1>
                    </div>
                    <p className="text-amber-200/70 font-medium">{category}</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Summary Card */}
        {summaryObj?.summaryText && visibleSections.has('summary') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-8 border border-blue-500/30 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Info className="text-blue-400" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-amber-100">Executive Summary</h2>
            </div>
            <p className="text-amber-50 leading-relaxed text-lg">
              <StreamingText text={summaryObj.summaryText} delay={800} />
            </p>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Important Points with Visual */}
          {summaryObj?.importantPoints?.length > 0 && visibleSections.has('keyPoints') && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="lg:col-span-2 bg-black/40 rounded-2xl p-6 border border-green-500/20 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="text-green-400" size={24} />
                <h2 className="text-xl font-semibold text-amber-100">Key Points</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  {summaryObj.importantPoints.slice(0, Math.ceil(summaryObj.importantPoints.length / 2)).map((point: string, idx: number) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.4 + idx * 0.2 }}
                      className="flex items-start gap-3 p-4 bg-black/30 rounded-lg"
                    >
                      <div className="w-3 h-3 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-amber-50"><StreamingText text={point} delay={1600 + idx * 200} /></p>
                    </motion.div>
                  ))}
                </div>
                <div className="space-y-4">
                  {summaryObj.importantPoints.slice(Math.ceil(summaryObj.importantPoints.length / 2)).map((point: string, idx: number) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.4 + idx * 0.2 }}
                      className="flex items-start gap-3 p-4 bg-black/30 rounded-lg"
                    >
                      <div className="w-3 h-3 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-amber-50"><StreamingText text={point} delay={1600 + idx * 200} /></p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Visual Explanation */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5 }}
            className="space-y-4"
          >
            <InternetImageCard 
              query={`legal document ${category} explanation`}
              title="Legal Context"
              description="Visual representation of legal concepts"
            />
          </motion.div>
        </div>

        {/* Risks & Consequences with Visual */}
        {(summaryObj?.mainRisksRightsConsequences || summaryObj?.whatHappensIfYouIgnoreThis) && visibleSections.has('risks') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 bg-black/40 rounded-2xl p-6 border border-red-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle className="text-red-400" size={24} />
                </div>
                <h2 className="text-xl font-semibold text-amber-100">Risks & Consequences</h2>
              </div>
              <div className="space-y-6">
                {summaryObj.mainRisksRightsConsequences && (
                  <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/20">
                    <h3 className="font-medium text-red-300 mb-3">Legal Implications</h3>
                    <p className="text-red-100">
                      <StreamingText text={summaryObj.mainRisksRightsConsequences} delay={2000} />
                    </p>
                  </div>
                )}
                {summaryObj.whatHappensIfYouIgnoreThis && (
                  <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-500/20">
                    <h3 className="font-medium text-orange-300 mb-3">If You Ignore This</h3>
                    <p className="text-orange-100">
                      <StreamingText text={summaryObj.whatHappensIfYouIgnoreThis} delay={2200} />
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <InternetImageCard 
              query="legal consequences risk warning"
              title="Risk Visualization"
              description="Understanding legal risks"
            />
          </motion.div>
        )}

        {/* Action Items */}
        {summaryObj?.whatYouShouldDoNow?.length > 0 && visibleSections.has('actions') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4 }}
            className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-2xl p-8 border border-amber-500/30 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-amber-500/20 rounded-full">
                <CheckCircle className="text-amber-400" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-amber-100">Immediate Actions Required</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {summaryObj.whatYouShouldDoNow.map((action: string, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.6 + idx * 0.2 }}
                  className="bg-black/40 rounded-xl p-6 border border-amber-500/20 hover:border-amber-400/40 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-amber-500 text-black rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                      {idx + 1}
                    </div>
                    <p className="text-amber-50 leading-relaxed">
                      <StreamingText text={action} delay={2800 + idx * 200} />
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Clauses Section with Visuals */}
        {data?.clauses?.length > 0 && visibleSections.has('clauses') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.0 }}
            className="bg-black/40 rounded-2xl p-8 border border-purple-500/20 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4 mb-8">
              <span className="text-3xl">📑</span>
              <h2 className="text-2xl font-bold text-amber-100">Important Clauses</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {data.clauses.map((clauseObj: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 3.2 + idx * 0.3 }}
                  className="bg-gradient-to-br from-black/50 to-purple-900/20 rounded-xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all group hover:scale-105"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-4 h-4 rounded-full mt-1 ${
                      clauseObj.importance === 'high' ? 'bg-red-400 shadow-lg shadow-red-400/50' :
                      clauseObj.importance === 'medium' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 
                      'bg-green-400 shadow-lg shadow-green-400/50'
                    } animate-pulse`} />
                    <h3 className="font-bold text-amber-100 flex-1 group-hover:text-purple-200 transition-colors">
                      <StreamingText text={clauseObj.clause || `Clause ${idx + 1}`} delay={3400 + idx * 300} />
                    </h3>
                  </div>
                  
                  {clauseObj.explanation?.Explanation && (
                    <div className="mb-4">
                      <p className="text-amber-50/90 text-sm leading-relaxed">
                        <StreamingText text={clauseObj.explanation.Explanation} delay={3600 + idx * 300} />
                      </p>
                    </div>
                  )}
                  
                  {clauseObj.explanation?.PunishmentDetails && (
                    <div className="bg-red-900/30 rounded-lg p-4 border border-red-500/30">
                      <p className="text-red-200 text-sm">
                        <span className="font-medium">⚠️ Penalties: </span>
                        <StreamingText text={clauseObj.explanation.PunishmentDetails} delay={3800 + idx * 300} />
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Related Information with Visual Grid */}
        {data?.relatedInfo?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 4.0 }}
            className="bg-black/40 rounded-2xl p-8 border border-blue-500/20 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <ExternalLink className="text-blue-400" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-amber-100">Related Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.relatedInfo.slice(0, 6).map((info: any, idx: number) => (
                <motion.a
                  key={idx}
                  href={info.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 4.2 + idx * 0.2 }}
                  className="bg-gradient-to-br from-black/50 to-blue-900/20 rounded-xl p-6 border border-blue-500/20 hover:border-blue-400/40 transition-all group hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <ExternalLink size={18} className="text-blue-400" />
                    </div>
                    <h3 className="font-medium text-blue-300 group-hover:text-blue-200 line-clamp-2 flex-1">
                      <StreamingText text={info.title} delay={4400 + idx * 200} />
                    </h3>
                  </div>
                  <p className="text-amber-50/70 text-sm line-clamp-3 mb-4">
                    <StreamingText text={info.snippet} delay={4600 + idx * 200} />
                  </p>
                  <div className="flex items-center gap-2 text-blue-400 text-sm opacity-70 group-hover:opacity-100 transition-opacity">
                    <span>Learn more</span>
                    <ExternalLink size={12} />
                  </div>
                </motion.a>
              ))}
            </div>
            
            {/* Additional Visual Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <InternetImageCard 
                query={`${category} legal guide tutorial`}
                title="Legal Guidance"
                description="Understanding legal requirements"
              />
              <InternetImageCard 
                query="legal compliance checklist"
                title="Compliance Guide"
                description="Steps for legal compliance"
              />
              <InternetImageCard 
                query="legal document analysis tools"
                title="Analysis Tools"
                description="Resources for document review"
              />
            </div>
          </motion.div>
        )}

        {/* Important Note */}
        {summaryObj?.importantNote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 4.5 }}
            className="bg-gradient-to-r from-red-900/40 to-pink-900/40 rounded-2xl p-8 border border-red-500/40 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-red-500/20 rounded-full animate-pulse">
                <AlertTriangle className="text-red-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-red-200">⚠️ Critical Notice</h2>
            </div>
            <p className="text-red-100 font-medium text-lg leading-relaxed">
              <StreamingText text={summaryObj.importantNote} delay={4700} />
            </p>
          </motion.div>
        )}

        {/* Enhanced Chat Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5.0 }}
          className="bg-black/50 rounded-2xl border border-white/20 overflow-hidden backdrop-blur-sm flex flex-col h-[600px]"
        >
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-full">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-amber-100">AI Assistant Chat</h2>
                <p className="text-amber-200/70">Ask detailed questions about your document</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-black/20">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <p className="text-amber-50/70 text-lg mb-2">Ask me anything about this document...</p>
                  <p className="text-amber-50/50 text-sm">I can explain clauses, risks, deadlines, and more!</p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
                  {[
                    "What are the key risks?",
                    "Explain the main clauses",
                    "What should I do next?",
                    "Are there any deadlines?",
                    "What are my rights?",
                    "What happens if I don't comply?"
                  ].map((suggestion, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 5.2 + idx * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setChatInput(suggestion)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 rounded-full text-sm hover:from-amber-500/30 hover:to-orange-500/30 transition-all border border-amber-500/30 hover:border-amber-400/50"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {chatHistory.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] px-6 py-4 rounded-2xl relative ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-br-md shadow-lg"
                          : "bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-bl-md border border-white/10"
                      }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <span className="text-xs opacity-70 mt-2 block">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                      {msg.sender === "user" && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-600 rounded-full"></div>
                      )}
                      {msg.sender === "bot" && (
                        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {/* Streaming message */}
                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-2xl rounded-bl-md border border-white/10">
                      <p className="whitespace-pre-wrap">{streamingMessage}</p>
                      <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1"></span>
                    </div>
                  </div>
                )}
                
                {isChatting && !streamingMessage && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 px-6 py-4 rounded-2xl rounded-bl-md border border-white/10">
                      <div className="flex space-x-2">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"
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

          {/* Enhanced Chat Input */}
          <div className="p-6 border-t border-white/10 bg-gradient-to-r from-black/40 to-gray-900/40 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Ask about clauses, risks, next steps, deadlines..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  className="w-full bg-white/10 border border-white/30 rounded-full px-6 py-4 text-amber-50 placeholder-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 backdrop-blur-sm transition-all"
                  disabled={isChatting}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-amber-50/30">
                  <span className="text-xs">Press Enter to send</span>
                </div>
              </div>
              <motion.button
                onClick={sendChat}
                disabled={!chatInput.trim() || isChatting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-full hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-amber-500/25 disabled:hover:scale-100"
              >
                <Send size={20} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}