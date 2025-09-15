// page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import HomePage from "@/components/home-page";
import AuthUI from "@/components/auth-form";
import { SidebarDemo } from "@/components/side"; // <- This now works

export default function Page() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const handleSelectDocument = (doc: any) => setSelectedDoc(doc);

  if (loading)
    return <div className="flex items-center justify-center h-screen text-lg">Loading...</div>;

  if (!user)
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <AuthUI />
      </div>
    );

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <SidebarDemo onSelectHistory={handleSelectDocument} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full">
        <HomePage user={user} document={selectedDoc} />
      </main>
    </div>
  );
}
