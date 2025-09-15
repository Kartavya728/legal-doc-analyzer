"use client";
import { motion } from "framer-motion";

export default function ImagesComponent({ data }: { data: string[] }) {
  if (!data?.length) return null;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((img, i) => (
        <motion.img
          key={i}
          src={img}
          alt="related"
          className="rounded-xl shadow-md border border-gray-600 hover:shadow-xl hover:scale-105 transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}
