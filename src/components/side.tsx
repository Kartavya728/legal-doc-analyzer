"use client";

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconMenu2,
  IconX,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { cn } from "@/lib/utils";

// ------------------- Types -------------------
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

interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
}

// ------------------- Sidebar Context -------------------
const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: ReactNode;
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

// ------------------- Sidebar Component -------------------
export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => (
  <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
    {children}
  </SidebarProvider>
);

// ------------------- Sidebar Body -------------------
export const SidebarBody = ({
  children,
  ...props
}: {
  children?: ReactNode;
} & React.ComponentProps<typeof motion.div>) => (
  <>
    <DesktopSidebar {...props}>{children}</DesktopSidebar>
    <MobileSidebar {...(props as React.ComponentProps<"div">)}>
      {children}
    </MobileSidebar>
  </>
);

// ------------------- Desktop Sidebar -------------------
export const DesktopSidebar = ({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
} & React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col w-[300px] shrink-0 justify-between bg-[#0D1117] text-neutral-200 shadow-lg border-r border-[#1B263B]",
        className
      )}
      animate={{ width: animate ? (open ? "300px" : "60px") : "300px" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      <div>{children}</div>
      <SidebarFooter />
    </motion.div>
  );
};

// ------------------- Mobile Sidebar -------------------
export const MobileSidebar = ({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
} & React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className="h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-[#0D1117] text-neutral-200 w-full"
      {...props}
    >
      <div className="flex justify-end z-20 w-full">
        <IconMenu2 className="text-neutral-200" onClick={() => setOpen(!open)} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
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

// ------------------- Sidebar Link -------------------
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
        title={link.label}
      >
        {link.label}
      </motion.span>
    </button>
  );
};

// ------------------- Sidebar Footer -------------------
const SidebarFooter = () => {
  const supabase = createClientComponentClient();
  const { open, animate } = useSidebar();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col gap-2 border-t border-[#1B263B] pt-2">
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-2 py-1 text-sm hover:text-red-500 transition-colors"
      >
        <IconLogout size={18} />
        <motion.span
          animate={{
            display: animate ? (open ? "inline-block" : "none") : "inline-block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          className="truncate max-w-[200px]"
        >
          Logout
        </motion.span>
      </button>
      <button className="flex items-center gap-2 px-2 py-1 text-sm hover:text-blue-400 transition-colors">
        <IconSettings size={18} />
        <motion.span
          animate={{
            display: animate ? (open ? "inline-block" : "none") : "inline-block",
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

// ------------------- Sidebar with Conversation History -------------------
export const SidebarDemo = ({
  onSelectHistory,
}: {
  onSelectHistory: (data: any) => void;
}) => {
  const supabase = createClientComponentClient();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("conversations")
        .select("id, data, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      if (!error && data) {
        setConversations(
          data.map((c: any) => ({
            id: c.id,
            title: c.data.display_input?.query || "Untitled Conversation",
            created_at: c.created_at,
          }))
        );
      }
    };
    fetchConversations();
  }, [supabase]);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    const { data, error } = await supabase
      .from("conversations")
      .select("data")
      .eq("id", id)
      .single();

    if (!error && data) {
      onSelectHistory(data.data);
    } else {
      console.error("Failed to load conversation", error);
    }
  };

  return (
    <Sidebar>
      <SidebarBody>
        <SidebarLink
          link={{
            label: "New Conversation",
            icon: <span>❇️</span>,
            onClick: () => window.location.assign("/"),
          }}
        />
        <div className="mt-4 flex flex-col gap-1">
          <div className="text-xs uppercase text-neutral-400 mb-1">
            Conversation History
          </div>

          {conversations.length === 0 && (
            <div className="text-neutral-500 text-sm">No conversations yet</div>
          )}

          {conversations.map((conv) => (
            <SidebarLink
              key={conv.id}
              link={{
                label: conv.title,
                icon: <span>💬</span>,
                onClick: () => handleSelect(conv.id),
              }}
              className={selectedId === conv.id ? "text-blue-400 font-bold" : ""}
            />
          ))}
        </div>
      </SidebarBody>
    </Sidebar>
  );
};
