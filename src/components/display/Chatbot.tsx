"use client";

import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";

interface ChatMessage {
  sender: "user" | "bot";
  text: string;
}

export default function Chatbot({ context }: { context: any }) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const saveToHistory = async (newMessage: ChatMessage) => {
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          displayInput: context,
          newMessage: {
            role: newMessage.sender,
            content: newMessage.text,
            timestamp: new Date().toISOString(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save history");
      if (!sessionId && data.id) setSessionId(data.id);
    } catch (err) {
      console.error("Error saving chat history:", err);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { sender: "user", text: chatInput };
    setChatHistory((prev) => [...prev, userMsg]);
    saveToHistory(userMsg);
    setChatInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          context: context,
          documentType: context?.documentType,
          category: context?.category,
        }),
      });

      if (!res.body) {
        const errorMsg: ChatMessage = { sender: "bot", text: "⚠️ No response from server." };
        setChatHistory((prev) => [...prev, errorMsg]);
        saveToHistory(errorMsg);
        setIsLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botMsg = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        botMsg += decoder.decode(value, { stream: true });

        setChatHistory((prev) => {
          const last = prev[prev.length - 1];
          if (last?.sender === "bot") {
            return [...prev.slice(0, -1), { sender: "bot", text: botMsg }];
          } else {
            return [...prev, { sender: "bot", text: botMsg }];
          }
        });
      }

      const finalBotMsg: ChatMessage = { sender: "bot", text: botMsg };
      saveToHistory(finalBotMsg);
    } catch (err) {
      console.error("Chatbot error:", err);
      const errorMsg: ChatMessage = { sender: "bot", text: "❌ Error: failed to fetch response." };
      setChatHistory((prev) => [...prev, errorMsg]);
      saveToHistory(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/40 rounded-2xl border border-gray-700 shadow-lg">
      <h2 className="text-lg font-semibold text-amber-200 p-4">
        💬 Ask AI about this document
      </h2>

      {/* Chat history scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`px-4 py-2 rounded-2xl max-w-[80%] whitespace-pre-line cursor-pointer select-text break-words ${
              msg.sender === "user"
                ? "bg-amber-500 text-black self-end ml-auto rounded-br-none hover:bg-amber-400"
                : "bg-gray-700 text-white self-start rounded-bl-none hover:bg-gray-600"
            }`}
            title="Click to copy"
            onClick={() => navigator.clipboard.writeText(msg.text)}
          >
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="text-sm text-gray-400 animate-pulse">🤖 Typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar always at bottom */}
      <div className="flex px-4 py-2 border-t border-gray-700 bg-gray-800 sticky bottom-0">
        <textarea
          className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white resize-none focus:outline-none focus:ring focus:ring-amber-500"
          placeholder="Type your question... (Shift+Enter = newline)"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          onClick={sendChat}
          disabled={isLoading}
          className="ml-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
