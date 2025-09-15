"use client";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

export default function ClausesCard({ clauses }: { clauses: string[] }) {
  if (!clauses?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-2xl p-6 border border-amber-500/20 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-4">
        <FileText className="text-amber-400" size={26} />
        <h2 className="text-xl font-semibold text-amber-200">Relevant Clauses</h2>
      </div>
      <ul className="space-y-3 text-amber-50">
        {clauses.map((c, i) => (
          <li key={i} className="bg-amber-800/20 px-4 py-2 rounded-xl hover:bg-amber-800/40 transition">
            {c}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
