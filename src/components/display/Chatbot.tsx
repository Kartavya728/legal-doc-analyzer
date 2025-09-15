"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

export default function Chatbot({ context }: { context: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", text: input }]);
    setMessages((prev) => [...prev, { role: "bot", text: "🤖 I'm still learning. Context-aware reply soon!" }]);
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-900/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold text-amber-200">Ask AI about this document</h2>
      <div className="h-48 overflow-y-auto space-y-2 bg-gray-800/30 p-3 rounded-lg text-gray-100">
        {messages.map((m, i) => (
          <div key={i} className={`${m.role === "user" ? "text-blue-300 text-right" : "text-gray-200"}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
          placeholder="Type your question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-white flex items-center gap-2"
        >
          <Send size={18} />
        </button>
      </div>
    </motion.div>
  );
}
