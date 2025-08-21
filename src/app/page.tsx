// app/page.tsx

import Display from "@/components/Display";

// A small reusable component for the info boxes to keep the main return clean
const InfoBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="max-w-xs p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg shadow-lg">
    <h2 className="text-lg font-bold mb-2 text-white">{title}</h2>
    <div className="text-sm text-gray-300">{children}</div>
  </div>
);


export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
 
      <header className="w-full p-4 sm:p-6 flex justify-between items-start">
  
        <InfoBox title="👥 Team Members">
          <ul className="list-disc list-inside">
            <li>Japneet - Frontend UI</li>
            <li>Noor(PSM)- Majdoori</li>
            <li>Dhanand - Gen Ai</li>
            <li>Naman - Ahh Ahh</li>
          </ul>
        </InfoBox>

        <InfoBox title="ℹ️ About the Project">
          <p>
            ye project ka main purpose hai PSM ka BDSM karna. so please iss Project me apna yog daan de
          </p>
        </InfoBox>
      </header>

   
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <Display />
      </main>

      <footer className="w-full p-4 text-center text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} PSMBDSM. All rights reserved.</p>
      </footer>
      
    </div>
  );
}