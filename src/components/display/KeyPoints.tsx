"use client";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function KeyPoints({ points }: { points: string[] }) {
  if (!points?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.2 }}
      className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-2xl p-6 border border-green-500/20 shadow-lg"
    >
      <h2 className="text-xl font-semibold text-emerald-200 mb-4">Key Points</h2>
      <ul className="space-y-3">
        {points.map((point, i) => (
          <motion.li
            key={i}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            whileHover={{ scale: 1.03 }}
            className="flex items-start gap-3 text-emerald-50 bg-emerald-800/20 px-4 py-2 rounded-xl"
          >
            <CheckCircle2 className="text-emerald-400 mt-1" size={20} />
            {point}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
