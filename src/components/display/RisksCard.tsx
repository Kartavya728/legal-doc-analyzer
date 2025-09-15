"use client";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function RisksCard({ risks, ignore }: { risks: string; ignore?: string }) {
  if (!risks) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-r from-red-900/40 to-rose-900/40 rounded-2xl p-6 border border-red-500/20 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="text-red-400" size={28} />
        <h2 className="text-xl font-semibold text-red-200">Risks & Consequences</h2>
      </div>
      <p className="text-red-100 mb-4">{risks}</p>
      {ignore && <p className="text-sm text-red-300 italic">If ignored: {ignore}</p>}
    </motion.div>
  );
}
