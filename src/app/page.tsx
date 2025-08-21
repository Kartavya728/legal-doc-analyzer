// app/page.tsx

import Display from "@/components/Display";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-10 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Display />
    </main>
  );
}