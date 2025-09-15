"use client";
import { motion } from "framer-motion";
import { ArrowRightCircle } from "lucide-react";

export default function ActionsCard({ actions }: { actions: string[] }) {
  if (!actions?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.2 }}
      className="bg-gradient-to-r from-indigo-900/40 to-violet-900/40 rounded-2xl p-6 border border-indigo-500/20 shadow-lg"
    >
      <h2 className="text-xl font-semibold text-indigo-200 mb-4">Recommended Actions</h2>
      <ul className="space-y-3">
        {actions.map((action, i) => (
          <motion.li
            key={i}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-3 text-indigo-50 bg-indigo-800/20 px-4 py-2 rounded-xl"
          >
            <ArrowRightCircle className="text-indigo-400" size={20} />
            {action}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
