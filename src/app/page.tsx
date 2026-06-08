"use client";

import { useState } from "react";
import { ResultDashboard } from "@/components/ResultDashboard";
import { StarryFooter } from "@/components/StarryFooter";
import { 
  GraduationCap, 
  AlertTriangle, 
  Info, 
  Key, 
  Cpu, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Layers,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showDevMode, setShowDevMode] = useState<boolean>(false);

  return (
    <main className="min-h-screen bg-background p-4 md:p-8 relative overflow-hidden pattern-dots">
      {/* Decorative primitive shapes in the background */}
      <div className="absolute top-[-10%] left-[-5%] w-64 h-64 bg-tertiary rounded-full mix-blend-multiply opacity-50 blur-sm pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-secondary rounded-full mix-blend-multiply opacity-30 blur-sm pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-quaternary blob-shape mix-blend-multiply opacity-40 blur-sm pointer-events-none" />

      <div className="mx-auto max-w-5xl space-y-12 relative z-10 pt-12 pb-24">
        {/* Header Section */}
        <header className="flex flex-col items-center space-y-6 text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-tertiary rounded-full translate-x-2 translate-y-2 border-2 border-border" />
            <div className="relative p-6 bg-white rounded-full border-2 border-border shadow-pop hover:-rotate-6 transition-transform duration-300 cursor-pointer">
              <GraduationCap className="h-14 w-14 text-accent" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-3xl font-heading font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground uppercase max-w-4xl px-4 leading-tight">
            MIT Result <span className="text-white bg-accent px-4 py-1 border-2 border-border inline-block -rotate-2 shadow-pop">Fetcher</span>
          </h1>
        </header>

        {!showDevMode ? (
          /* Landing/Deactivation Page Content */
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Main Deactivation Alert Banner (Neobrutalist) */}
            <div className="relative group">
              <div className="absolute inset-0 bg-secondary rounded-2xl translate-x-2.5 translate-y-2.5 border-2 border-border group-hover:translate-x-3.5 group-hover:translate-y-3.5 transition-transform duration-300" />
              <div className="relative bg-white border-2 border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-pop-soft hover:scale-[1.005] transition-transform duration-300">
                <div className="p-4 bg-tertiary rounded-xl border-2 border-border flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-12 w-12 text-foreground animate-bounce" />
                </div>
                <div className="space-y-3 text-center md:text-left">
                  <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    Service Status: Suspended
                  </span>
                  <h2 className="text-2xl md:text-3xl font-heading font-black text-foreground leading-tight">
                    MIT Fetcher is deactivated for some time, will be active to help MITians very soon.
                  </h2>
                  <p className="text-xl font-extrabold text-accent flex items-center justify-center md:justify-start gap-1">
                    Jai MIT 🚩
                  </p>
                </div>
              </div>
            </div>

            {/* Why CAPTCHAs are hard to bypass (Educational Section) */}
            <div className="bg-white border-2 border-border rounded-2xl p-6 md:p-8 shadow-pop relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-quaternary rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 pointer-events-none" />
              
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b-2 border-dashed border-border pb-4">
                  <Info className="h-6 w-6 text-accent" strokeWidth={2.5} />
                  <h3 className="text-xl md:text-2xl font-heading font-black text-foreground">
                    Understanding the Security Model
                  </h3>
                </div>

                <p className="text-sm md:text-base font-medium text-muted-foreground leading-relaxed">
                  Bypassing the verification step on the BEU result portal requires solving Google reCAPTCHA. Here is why the protection works cryptographically, and why direct backend bypasses are impossible:
                </p>

                {/* 3-Step Handshake Diagram */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  <div className="relative bg-muted/30 border-2 border-border p-5 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="h-8 w-8 bg-accent text-white flex items-center justify-center font-bold text-sm rounded-lg border border-border mb-3">
                        1
                      </div>
                      <h4 className="font-extrabold text-foreground text-sm uppercase tracking-wide">
                        Client Challenge
                      </h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-1.5 leading-relaxed">
                        The user interacts with Google's reCAPTCHA widget. Google validates browser patterns and returns a signed token to the browser.
                      </p>
                    </div>
                  </div>

                  <div className="relative bg-muted/30 border-2 border-border p-5 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="h-8 w-8 bg-secondary text-foreground flex items-center justify-center font-bold text-sm rounded-lg border border-border mb-3">
                        2
                      </div>
                      <h4 className="font-extrabold text-foreground text-sm uppercase tracking-wide">
                        Token Exchange
                      </h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-1.5 leading-relaxed">
                        The frontend sends this Google token to the BEU endpoint: <br />
                        <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] break-all font-mono font-bold mt-1 inline-block border border-border">/result/token?captcha=...</code>
                      </p>
                    </div>
                  </div>

                  <div className="relative bg-muted/30 border-2 border-border p-5 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="h-8 w-8 bg-tertiary text-foreground flex items-center justify-center font-bold text-sm rounded-lg border border-border mb-3">
                        3
                      </div>
                      <h4 className="font-extrabold text-foreground text-sm uppercase tracking-wide">
                        Backend Validation
                      </h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-1.5 leading-relaxed">
                        The BEU server performs a server-to-server request to Google's verify API. If success, it returns an access token valid for a <strong>single</strong> query.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6 text-amber-800 space-y-2">
                  <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                    <Key className="h-4 w-4" />
                    Strict Backend Constraints
                  </h4>
                  <p className="text-xs font-semibold leading-relaxed">
                    The backend results API strictly validates the session token. Requesting results without solving a CAPTCHA results in a <strong>403 Forbidden</strong> rejection, and tokens are invalidated immediately after a single query.
                  </p>
                </div>
              </div>
            </div>

            {/* Alternative Solutions Card */}
            <div className="bg-white border-2 border-border rounded-2xl p-6 md:p-8 shadow-pop">
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b-2 border-dashed border-border pb-4">
                  <Cpu className="h-6 w-6 text-accent" strokeWidth={2.5} />
                  <h3 className="text-xl md:text-2xl font-heading font-black text-foreground">
                    Methods We Support When Active
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0 border border-accent/20">
                      👍
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">Sequential Interactive Solving (Free)</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-normal font-semibold">
                        A manual but free flow where you solve the captcha in-app once, the browser fetches the result, and immediately resets the widget for the next student.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start border-t border-dashed border-border pt-4">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0 border border-secondary/20">
                      ⚡
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">Buster Browser Extension (Free / Automation Helper)</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-normal font-semibold">
                        A browser helper that solves the reCAPTCHA audio challenges automatically using voice recognition, making the sequential fetching flow hands-free.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start border-t border-dashed border-border pt-4">
                    <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0 border border-tertiary/20">
                      🤖
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">API-Based Auto Captcha (Paid / Hands-Free)</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-normal font-semibold">
                        Third-party solvers (like 2Captcha) handle reCAPTCHAs server-side using API keys, resolving results for the entire class dynamically in parallel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dev Mode Trigger */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setShowDevMode(true)}
                variant="outline"
                className="text-xs font-bold border-2 border-border shadow-pop bg-muted/40 hover:bg-muted/80 text-foreground transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                Dev Mode Preview (Toggle Dashboard)
              </Button>
            </div>

          </div>
        ) : (
          /* Dashboard Mode */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex justify-between items-center bg-white p-4 border-2 border-border rounded-xl shadow-pop">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse border border-border" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Developer Preview Mode
                </span>
              </div>
              <Button
                onClick={() => setShowDevMode(false)}
                variant="destructive"
                className="h-8 text-xs font-bold border-2 border-border shadow-pop bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 flex items-center gap-1.5"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Exit Preview Mode
              </Button>
            </div>
            
            <ResultDashboard />
          </div>
        )}

        <div className="pt-16">
          <StarryFooter />
        </div>
      </div>
    </main>
  );
}
