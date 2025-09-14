"use client";

import { motion } from "framer-motion";

interface DocumentGridProps {
  items: Array<{
    title: string;
    content: string;
    icon?: string;
  }>;
}

export default function DocumentGrid({ items }: DocumentGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10"
        >
          <div className="flex items-center mb-3">
            {item.icon && <span className="text-2xl mr-2">{item.icon}</span>}
            <h3 className="text-lg font-medium text-white">{item.title}</h3>
          </div>
          <p className="text-gray-300 text-sm">{item.content}</p>
        </motion.div>
      ))}
    </div>
  );
}