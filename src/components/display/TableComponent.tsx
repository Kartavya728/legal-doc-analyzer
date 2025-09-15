"use client";
import { motion } from "framer-motion";

export default function TableComponent({ data }: { data: any[] }) {
  if (!data?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ scale: 1.01 }}
      className="overflow-x-auto bg-gray-900/30 rounded-2xl border border-gray-600 shadow-md p-4"
    >
      <table className="w-full text-left text-gray-200">
        <thead className="bg-gray-800/60">
          <tr>
            {Object.keys(data[0]).map((key) => (
              <th key={key} className="p-3 font-semibold uppercase text-sm">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="hover:bg-gray-700/40 transition"
            >
              {Object.values(row).map((val, j) => (
                <td key={j} className="p-3 border-t border-gray-700">{val}</td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
