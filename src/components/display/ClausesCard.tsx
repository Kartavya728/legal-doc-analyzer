import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

// The data structure for a single clause, based on your error message
interface Clause {
  title: string;
  content: string;
  importance: string;
  explanation: string;
}

interface ClausesCardProps {
  clauses: Clause[];
}

export default function ClausesCard({ clauses }: ClausesCardProps) {
  // Return nothing if there are no clauses to display
  if (!Array.isArray(clauses) || clauses.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-4">📜 Key Clauses</h2>
      <div className="space-y-3">
        {clauses.map((clause, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Using the <details> element for a native accordion */}
            <details className="group bg-slate-900/70 rounded-lg border border-slate-700 overflow-hidden">
              <summary className="p-4 flex justify-between items-center cursor-pointer list-none hover:bg-slate-800 transition-colors">
                <span className="font-semibold text-white">{clause.title}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">{clause.importance}</span>
                    <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </div>
              </summary>
              <div className="p-4 border-t border-slate-700 bg-slate-900">
                <h4 className="font-semibold text-slate-300 mb-2">Content:</h4>
                <p className="text-slate-400 mb-4 whitespace-pre-wrap">{clause.content}</p>
                <h4 className="font-semibold text-slate-300 mb-2">Explanation:</h4>
                <p className="text-slate-400 whitespace-pre-wrap">{clause.explanation}</p>
              </div>
            </details>
          </motion.div>
        ))}
      </div>
    </div>
  );
}