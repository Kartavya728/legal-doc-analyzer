"use client";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

export default function SummaryCard({ summary }: { summary: string }) {
  if (!summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-2xl p-6 border border-blue-500/20 shadow-lg hover:shadow-xl"
    >
      <div className="flex items-center gap-3 mb-4">
        <Info className="text-blue-400" size={28} />
        <h2 className="text-xl font-semibold text-amber-100">Executive Summary</h2>
      </div>
      <p className="text-amber-50 leading-relaxed text-lg">{summary}</p>
    </motion.div>
  );
}
