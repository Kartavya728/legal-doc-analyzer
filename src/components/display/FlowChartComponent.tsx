"use client";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Info } from "lucide-react";

interface FlowChartEvent {
  date: string;
  title: string;
  description: string;
  impact: string;
}

interface FlowChartData {
  title: string;
  description: string;
  events: FlowChartEvent[];
}

export default function FlowChartComponent({ data }: { data: FlowChartData[] }) {
  if (!data?.length) return null;

  return (
    <div className="space-y-10">
      {data.map((flowchart, chartIndex) => (
        <motion.div
          key={chartIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-900/30 rounded-2xl border border-gray-600 shadow-md p-6"
        >
          {flowchart.title && (
            <h3 className="text-xl font-semibold mb-2">{flowchart.title}</h3>
          )}
          {flowchart.description && (
            <p className="text-gray-300 mb-6">{flowchart.description}</p>
          )}
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-indigo-500/50"></div>
            
            {/* Timeline events */}
            <div className="space-y-8">
              {flowchart.events.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 relative"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center z-10">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="flex-grow p-4 bg-indigo-900/40 text-indigo-100 rounded-xl border border-indigo-500/30 shadow"
                  >
                    <div className="text-xs text-indigo-300 mb-1">{event.date}</div>
                    <h4 className="font-medium text-lg mb-2">{event.title}</h4>
                    <p className="text-sm text-indigo-200 mb-3">{event.description}</p>
                    
                    {event.impact && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-indigo-950/50 rounded border border-indigo-400/20">
                        <Info className="w-4 h-4 text-indigo-300 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-300">{event.impact}</p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
