"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function FlowChartComponent({ data }: { data: string[] }) {
  if (!data?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-wrap gap-4 justify-center"
    >
      {data.map((step, i) => (
        <motion.div
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ scale: 1.05 }}
          className="px-5 py-3 bg-indigo-900/40 text-indigo-100 rounded-xl border border-indigo-500/30 shadow"
        >
          {step}
        </motion.div>
      ))}
      <ArrowRight className="text-indigo-400" />
    </motion.div>
  );
}
