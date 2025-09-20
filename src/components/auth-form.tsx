"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthUI() {
  const supabase = createClientComponentClient();

  return (
    <div className="h-full min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black text-white">
     
      <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent">
          Welcome Back
        </h1>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            style: {
              button: {
                background: "linear-gradient(to right, #55A1F7FF, #ec4899)",
                color: "white",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                fontWeight: "600",
              },
              anchor: { color: "#5583F7FF" },
              input: {
                backgroundColor: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "0.5rem",
                color: "white",
                padding: "0.75rem",
              },
              label: { color: "white", marginBottom: "0.25rem" },
            },
          }}
          theme="dark"
          providers={["google", "github"]}
        />
      </div>
    </div>
  );
}