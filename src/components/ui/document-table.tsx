"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

interface DocumentTableProps {
  headers: string[];
  rows: Array<string[]>;
  title?: string;
}

export default function DocumentTable({ headers, rows, title }: DocumentTableProps) {
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnIndex);
      setSortDirection("asc");
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (sortColumn === null) return 0;
    
    const valueA = a[sortColumn].toLowerCase();
    const valueB = b[sortColumn].toLowerCase();
    
    if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const filteredRows = sortedRows.filter(row => {
    return row.some(cell => 
      cell.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
    >
      {title && (
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
      )}
      
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700/50">
              {headers.map((header, index) => (
                <th 
                  key={index} 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-300 cursor-pointer hover:bg-gray-700/70"
                  onClick={() => handleSort(index)}
                >
                  <div className="flex items-center">
                    {header}
                    {sortColumn === index && (
                      <span className="ml-1">
                        {sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className="border-t border-gray-700 hover:bg-gray-700/30"
                >
                  {row.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      className="px-4 py-3 text-sm text-gray-300"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={headers.length} 
                  className="px-4 py-3 text-center text-gray-400"
                >
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}