"use client";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconMenu2,
  IconX,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface Links {
  label: string;
  href?: string;
  icon?: React.JSX.Element | React.ReactNode;
  onClick?: () => void;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

interface DocumentItem {
  id: string;
  title: string | null;
  file_name: string | null;
  created_at: string;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col w-[300px] shrink-0 justify-between",
        "bg-[#0D1117] text-neutral-200 shadow-lg border-r border-[#1B263B]",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      <div>{children}</div>
      <SidebarFooter />
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className="h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-[#0D1117] text-neutral-200 w-full"
      {...props}
    >
      <div className="flex justify-end z-20 w-full">
        <IconMenu2
          className="text-neutral-200"
          onClick={() => setOpen(!open)}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className={cn(
              "fixed h-full w-full inset-0 bg-[#0D1117] text-neutral-200 p-10 z-[100] flex flex-col justify-between",
              className
            )}
          >
            <div
              className="absolute right-10 top-10 z-50 text-neutral-200"
              onClick={() => setOpen(!open)}
            >
              <IconX />
            </div>
            <div>{children}</div>
            <SidebarFooter />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  return (
    <button
      onClick={link.onClick}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 hover:text-blue-400 transition-colors w-full text-left",
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm whitespace-pre inline-block !p-0 !m-0 truncate max-w-[200px]"
        title={link.label} // tooltip on hover
      >
        {link.label}
      </motion.span>
    </button>
  );
};

const SidebarFooter = () => {
  const supabase = createClientComponentClient();
  const { open, animate } = useSidebar();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col gap-2 border-t border-[#1B263B] pt-2">
      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-2 py-1 text-sm hover:text-red-500 transition-colors"
      >
        <IconLogout size={18} />
        <motion.span
          animate={{
            display: animate
              ? open
                ? "inline-block"
                : "none"
              : "inline-block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          className="truncate max-w-[200px]"
        >
          Logout
        </motion.span>
      </button>

      {/* Settings */}
      <button className="flex items-center gap-2 px-2 py-1 text-sm hover:text-blue-400 transition-colors">
        <IconSettings size={18} />
        <motion.span
          animate={{
            display: animate
              ? open
                ? "inline-block"
                : "none"
              : "inline-block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          className="truncate max-w-[200px]"
        >
          Settings
        </motion.span>
      </button>
    </div>
  );
};

export const SidebarDemo = ({
  onSelectHistory,
}: {
  onSelectHistory: (id: string) => void;
}) => {
  const supabase = createClientComponentClient();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => {
    const fetchDocuments = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("documents")
        .select("id, title, file_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setDocuments(data);
      }
    };

    fetchDocuments();
  }, [supabase]);

  return (
    <Sidebar>
      <SidebarBody>
        {/* Dashboard link */}
        <SidebarLink
          link={{
            label: "Upload New Document",
            icon: <span>❇️</span>,
            onClick: () => window.location.assign("/"),
          }}
        />

        {/* Documents Section */}
        <div className="mt-4 flex flex-col gap-1">
          <div className="text-xs uppercase text-neutral-400 mb-1">
            All Docs
          </div>

          {documents.length === 0 && (
            <div className="text-neutral-500 text-sm">No documents yet</div>
          )}

          {documents.map((doc) => (
            <SidebarLink
              key={doc.id}
              link={{
                label: doc.title || doc.file_name || "Untitled Document",
                icon: <span>📄</span>,
                onClick: () => onSelectHistory(doc.id),
              }}
            />
          ))}
        </div>
      </SidebarBody>
    </Sidebar>
  );
};
