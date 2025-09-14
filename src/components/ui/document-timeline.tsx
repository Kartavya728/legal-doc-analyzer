"use client";

import { motion } from "framer-motion";

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  status?: "completed" | "pending" | "upcoming";
}

interface DocumentTimelineProps {
  events: TimelineEvent[];
  title?: string;
}

export default function DocumentTimeline({ events, title }: DocumentTimelineProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "upcoming":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

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

      <div className="p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700"></div>

          {/* Timeline events */}
          <div className="space-y-6">
            {events.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-10"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1.5 w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(
                    event.status
                  )} border-4 border-gray-800 z-10`}
                >
                  <span className="text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>

                {/* Event content */}
                <div className="bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors">
                  <div className="text-sm text-gray-400 mb-1">{event.date}</div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {event.title}
                  </h3>
                  <p className="text-gray-300 text-sm">{event.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}