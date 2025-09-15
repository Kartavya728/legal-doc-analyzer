"use client";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

export default function RelatedInfoGrid({ items }: { items: any[] }) {
  if (!items?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid md:grid-cols-2 gap-6"
    >
      {items.map((item, i) => (
        <motion.a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ scale: 1.05 }}
          className="p-5 rounded-2xl border border-gray-600 bg-gray-800/40 shadow-md flex flex-col gap-2"
        >
          <h3 className="text-lg font-semibold text-amber-100 flex items-center gap-2">
            {item.title} <ExternalLink size={16} />
          </h3>
          <p className="text-sm text-gray-300">{item.description}</p>
          <span className="text-xs text-gray-400">Source: {item.source}</span>
        </motion.a>
      ))}
    </motion.div>
  );
}
