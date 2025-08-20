import UploadForm from "@/components/UploadForm";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Document Analysis Engine
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Powered by Python, LangGraph, and Next.js
          </p>
        </div>
        
        <UploadForm />
      </div>
    </main>
  );
}