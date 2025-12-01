import { ResultDashboard } from "@/components/ResultDashboard";
import { GraduationCap } from "lucide-react";
import { StarryFooter } from "@/components/StarryFooter";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 animate-gradient p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col items-center space-y-4 text-center pt-8">
          <div className="p-4 bg-white rounded-full shadow-lg ring-1 ring-slate-900/5">
            <GraduationCap className="h-12 w-12 text-indigo-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              MIT Result Fetcher
            </h1>
            <p className="text-muted-foreground max-w-[600px] mx-auto text-lg">
              Instantly fetch and analyze class results for MIT Muzaffarpur.
            </p>
          </div>
        </header>
        <ResultDashboard />
        <StarryFooter />
      </div>
    </main>
  );
}
