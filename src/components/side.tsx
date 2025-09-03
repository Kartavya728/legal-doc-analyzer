"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import {
  IconArrowLeft,
  IconSettings,
  IconFileText,
} from "@tabler/icons-react";
import { motion } from "motion/react";

// Mocked function — replace with Supabase query later
const fetchUserDocs = async () => {
  return [
    { id: "1", name: "Employment Agreement" },
    { id: "2", name: "Lease Contract" },
    { id: "3", name: "NDA Document" },
  ];
};

export function SidebarDemo() {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchUserDocs().then(setDocs);
  }, []);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-6 bg-neutral-900 dark:bg-neutral-950 rounded-2xl shadow-lg">
        {/* Top section: User info + history */}
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {/* User ID / Profile */}
          <div className="flex items-center gap-3 mb-6 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition">
            <img
              src="OIP.jpeg"
              alt="User Avatar"
              className="h-9 w-9 rounded-full border border-neutral-700"
            />
            {open && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium text-amber-50"
              >
                User_12345
              </motion.span>
            )}
          </div>

          {/* History */}
          <div className="flex flex-col gap-2">
            {docs.map((doc) => (
              <SidebarLink
                key={doc.id}
                link={{
                  label: doc.name,
                  href: `/chat/${doc.id}`,
                  icon: (
                    <IconFileText className="h-5 w-5 shrink-0 text-amber-50" />
                  ),
                }}
                className="rounded-xl px-3 py-2 hover:bg-neutral-800 text-amber-50 transition"
              />
            ))}
          </div>
        </div>

        {/* Bottom section: Settings + Logout */}
        <div className="flex flex-col gap-2 border-t border-neutral-800 pt-4">
          <SidebarLink
            link={{
              label: "Settings",
              href: "/settings",
              icon: (
                <IconSettings className="h-5 w-5 shrink-0 text-amber-50" />
              ),
            }}
            className="rounded-xl px-3 py-2 hover:bg-neutral-800 text-amber-50 transition"
          />
          <SidebarLink
            link={{
              label: "Logout",
              href: "/logout",
              icon: (
                <IconArrowLeft className="h-5 w-5 shrink-0 text-amber-50" />
              ),
            }}
            className="rounded-xl px-3 py-2 hover:bg-neutral-800 text-amber-50 transition"
          />
        </div>
      </SidebarBody>
    </Sidebar>
  );
}
