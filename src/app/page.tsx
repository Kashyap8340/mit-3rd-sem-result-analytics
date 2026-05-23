import { ResultDashboard } from "@/components/ResultDashboard";
import { GraduationCap } from "lucide-react";
import { StarryFooter } from "@/components/StarryFooter";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8 relative overflow-hidden pattern-dots">
      {/* Decorative primitive shapes in the background */}
      <div className="absolute top-[-10%] left-[-5%] w-64 h-64 bg-tertiary rounded-full mix-blend-multiply opacity-50 blur-sm pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-secondary rounded-full mix-blend-multiply opacity-30 blur-sm pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-quaternary blob-shape mix-blend-multiply opacity-40 blur-sm pointer-events-none" />

      <div className="mx-auto max-w-6xl space-y-12 relative z-10 pt-12 pb-24">
        <ResultDashboard />
        
        <div className="pt-16">
          <StarryFooter />
        </div>
      </div>
    </main>
  );
}
