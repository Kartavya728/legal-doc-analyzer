"use client";
import { motion } from "framer-motion";

interface ImageData {
  url: string;
  alt: string;
  caption: string;
}

export default function ImagesComponent({ data }: { data: ImageData[] }) {
  if (!data?.length) return null;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((img, i) => (
        <motion.div
          key={i}
          className="flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <motion.img
            src={img.url}
            alt={img.alt || "Image"}
            className="rounded-xl shadow-md border border-gray-600 hover:shadow-xl hover:scale-105 transition object-cover h-48 w-full"
            whileHover={{ scale: 1.05 }}
          />
          {img.caption && (
            <p className="text-sm text-gray-300 mt-2 italic">{img.caption}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
