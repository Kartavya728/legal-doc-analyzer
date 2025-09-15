"use client";
import { motion } from "framer-motion";

interface TableData {
  title: string;
  description: string;
  columns: Array<{ key: string; label: string }>;
  rows: any[];
}

export default function TableComponent({ data }: { data: TableData[] }) {
  if (!data?.length) return null;

  return (
    <div className="space-y-8">
      {data.map((table, tableIndex) => (
        <motion.div
          key={tableIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.01 }}
          className="overflow-x-auto bg-gray-900/30 rounded-2xl border border-gray-600 shadow-md p-4"
        >
          {table.title && (
            <h3 className="text-xl font-semibold mb-2">{table.title}</h3>
          )}
          {table.description && (
            <p className="text-gray-300 mb-4">{table.description}</p>
          )}
          <table className="w-full text-left text-gray-200">
            <thead className="bg-gray-800/60">
              <tr>
                {table.columns.map((column) => (
                  <th key={column.key} className="p-3 font-semibold uppercase text-sm">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-gray-700/40 transition"
                >
                  {table.columns.map((column) => (
                    <td key={column.key} className="p-3 border-t border-gray-700">
                      {row[column.key]}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      ))}
    </div>
  );
}
