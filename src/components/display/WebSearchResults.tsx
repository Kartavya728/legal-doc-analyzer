"use client";
import { motion } from "framer-motion";

interface WebSearchResult {
  title: string;
  url: string;
  description: string;
}

export default function WebSearchResults({ data }: { data: WebSearchResult[] }) {
  if (!data || data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6"
    >
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Web Search Results</h2>
      <div className="space-y-4">
        {data.map((result, index) => (
          <motion.div
            key={index}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0"
          >
            <a 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline text-lg font-medium"
            >
              {result.title}
            </a>
            <p className="text-gray-500 text-sm mb-2">{result.url}</p>
            <p className="text-gray-700 dark:text-gray-300">{result.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}