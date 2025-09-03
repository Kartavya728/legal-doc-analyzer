"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SidebarDemo } from "@/components/side";
import HomePage from "@/components/home-page";
import AuthUI from "@/components/auth-form";

export default function Page() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Selected document state
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Load auth state
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  // 🔹 Handler when a sidebar item is clicked
  const handleSelectDocument = async (id: string) => {
    console.log("Document selected:", id);

    const { data, error } = await supabase
      .from("documents")
      .select(
        `
        id,
        title,
        file_name,
        original_text,
        translated_text,
        summary,
        category,
        structure,
        metadata,
        created_at
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching document:", error);
      return;
    }

    setSelectedDoc(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg">
        Loading...
      </div>
    );
  }

  // 🔹 Show Auth page if not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <AuthUI />
      </div>
    );
  }

  // 🔹 Logged in → show sidebar + homepage
  return (
    <div className="flex h-screen">
      {/* Sidebar that loads documents */}
      <SidebarDemo onSelectHistory={handleSelectDocument} />

      {/* Main content updates when doc is selected */}
      <main className="flex-1 overflow-y-auto">
        <HomePage user={user} document={selectedDoc} />
      </main>
    </div>
  );
}
