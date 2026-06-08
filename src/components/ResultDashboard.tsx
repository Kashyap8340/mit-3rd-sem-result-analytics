"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassSummary } from "@/components/ClassSummary";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";

const ResultTable = dynamic(() => import("@/components/ResultTable").then(mod => mod.ResultTable), { ssr: false });
const AnalysisSection = dynamic(() => import("@/components/AnalysisSection").then(mod => mod.AnalysisSection), { ssr: false });
import { BRANCH_DATA, BATCH_CONFIGS, generateRegistrationNumbers } from "@/lib/utils";
import { fetchClassResults, isAutoCaptchaEnabled, fetchStudentWithCaptcha, resolveExamId } from "@/app/actions";
import { StudentResult } from "@/types";
import { Loader2, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResultDashboard() {
    const [isMounted, setIsMounted] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<string>("");
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [results, setResults] = useState<StudentResult[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [activeTab, setActiveTab] = useState<"table" | "analytics">("table");

    // Token states
    const [captchaToken, setCaptchaToken] = useState<string>("");
    const [manualToken, setManualToken] = useState<string>("");
    const [showManualInput, setShowManualInput] = useState<boolean>(false);
    const [isAutoCaptcha, setIsAutoCaptcha] = useState<boolean>(false);

    // Multi-step free fetch state
    const [isMultiStep, setIsMultiStep] = useState<boolean>(false);
    const [pendingRegs, setPendingRegs] = useState<string[]>([]);
    const [currentRegIndex, setCurrentRegIndex] = useState<number>(0);
    const [resolvedExamIdState, setResolvedExamIdState] = useState<string>("");
    const [multiStepBatchConfig, setMultiStepBatchConfig] = useState<any>(null);

    // ── Load settings and recaptcha on mount
    useEffect(() => {
        setIsMounted(true);

        // Check if server has 2Captcha API key configured
        isAutoCaptchaEnabled().then((enabled) => {
            setIsAutoCaptcha(enabled);
        });

        // Load Google reCAPTCHA script
        const scriptId = "google-recaptcha-script";
        if (!document.getElementById(scriptId)) {
            const script = document.createElement("script");
            script.id = scriptId;
            script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        // Define global callback
        (window as any).onRecaptchaLoad = () => {
            if (typeof window !== "undefined" && (window as any).grecaptcha) {
                try {
                    (window as any).grecaptcha.render("recaptcha-container-dashboard", {
                        sitekey: "6LccKAMtAAAAAHAqgWYhfhuUiRz_M2r9hbgHhjXf",
                        callback: (token: string) => {
                            setCaptchaToken(token);
                        },
                        "expired-callback": () => {
                            setCaptchaToken("");
                        }
                    });
                } catch (e) {
                    console.error("Error rendering reCAPTCHA:", e);
                }
            }
        };

        // If grecaptcha is already loaded, render it directly
        if (typeof window !== "undefined" && (window as any).grecaptcha && (window as any).grecaptcha.render) {
            try {
                setTimeout(() => {
                    const container = document.getElementById("recaptcha-container-dashboard");
                    if (container && container.innerHTML === "") {
                        (window as any).grecaptcha.render("recaptcha-container-dashboard", {
                            sitekey: "6LccKAMtAAAAAHAqgWYhfhuUiRz_M2r9hbgHhjXf",
                            callback: (token: string) => {
                                setCaptchaToken(token);
                            },
                            "expired-callback": () => {
                                setCaptchaToken("");
                            }
                        });
                    }
                }, 500);
            } catch (e) {
                console.error("Direct reCAPTCHA render error:", e);
            }
        }
    }, []);

    // Effect to handle sequential CAPTCHA solving in multi-step mode
    useEffect(() => {
        if (isMultiStep && captchaToken && pendingRegs.length > 0 && currentRegIndex < pendingRegs.length && multiStepBatchConfig) {
            const fetchSingle = async () => {
                const regNo = pendingRegs[currentRegIndex];
                setStatusMessage(`Fetching student ${currentRegIndex + 1} of ${pendingRegs.length} (${regNo})...`);
                
                const currentCaptchaToken = captchaToken;
                // Reset captchaToken state immediately so user/Buster can solve the next CAPTCHA
                setCaptchaToken("");
                if (typeof window !== "undefined" && (window as any).grecaptcha) {
                    try {
                        (window as any).grecaptcha.reset();
                    } catch (e) {
                        console.error("Error resetting reCAPTCHA:", e);
                    }
                }

                try {
                    const studentResult = await fetchStudentWithCaptcha(
                        regNo,
                        multiStepBatchConfig.apiYear,
                        multiStepBatchConfig.apiSemester,
                        multiStepBatchConfig.apiExamHeld,
                        currentCaptchaToken,
                        resolvedExamIdState
                    );

                    if (studentResult) {
                        setResults((prev) => {
                            // Avoid duplicates
                            if (prev.some((r) => r.redg_no === studentResult.redg_no)) {
                                return prev;
                            }
                            return [...prev, studentResult];
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching student ${regNo}:`, error);
                }

                const nextIndex = currentRegIndex + 1;
                const progressPercent = (nextIndex / pendingRegs.length) * 100;
                setProgress(progressPercent);

                if (nextIndex < pendingRegs.length) {
                    setCurrentRegIndex(nextIndex);
                    setStatusMessage(`Please solve the CAPTCHA to fetch student ${nextIndex + 1} of ${pendingRegs.length} (${pendingRegs[nextIndex]})`);
                } else {
                    // Completed!
                    setIsMultiStep(false);
                    setIsFetching(false);
                    setProgress(100);
                    setStatusMessage("Completed!");
                }
            };
            fetchSingle();
        }
    }, [captchaToken, isMultiStep, pendingRegs, currentRegIndex, resolvedExamIdState, multiStepBatchConfig]);

    const handleFetch = async () => {
        if (!selectedBranch || !selectedBatch) return;

        setIsFetching(true);
        setResults([]);
        setProgress(0);
        setStatusMessage("Initializing...");
        setActiveTab("table"); // Reset to table view on new fetch

        const branch = BRANCH_DATA.find((b) => b.code === selectedBranch);
        const batchConfig = BATCH_CONFIGS.find((b) => b.id === selectedBatch);
        if (!branch || !batchConfig) {
            setIsFetching(false);
            return;
        }

        const regNos = generateRegistrationNumbers(branch.code, branch.count, batchConfig.id);
        const apiYear = batchConfig.apiYear;
        const apiSemester = batchConfig.apiSemester;
        const apiExamHeld = batchConfig.apiExamHeld;

        // Resolve examId first so it is available for verification links in the result table
        let examId = "";
        try {
            examId = await resolveExamId(apiSemester, apiExamHeld);
            setResolvedExamIdState(examId);
        } catch (error) {
            console.error("Failed to resolve examId:", error);
        }

        // 1. If we are in free, manual/browser CAPTCHA mode (no 2Captcha key and no manual token)
        if (!isAutoCaptcha && !manualToken) {
            setPendingRegs(regNos);
            setMultiStepBatchConfig({
                apiYear,
                apiSemester,
                apiExamHeld
            });
            setIsMultiStep(true);
            setCurrentRegIndex(0);

            if (captchaToken) {
                setStatusMessage(`Starting fetch: Student 1 of ${regNos.length} (${regNos[0]})...`);
            } else {
                setStatusMessage(`Verification Required: Please solve the CAPTCHA to fetch student 1 of ${regNos.length} (${regNos[0]})`);
            }
            return;
        }

        // 2. Existing Auto-Captcha or single Manual Token flow
        // Start a fake progress interval while waiting for the single server action
        let currentProgress = 5;
        setProgress(currentProgress);
        setStatusMessage(isAutoCaptcha ? "Auto-solving CAPTCHAs in batches..." : "Fetching results securely using manual token...");
        
        const progressInterval = setInterval(() => {
            currentProgress += (100 - currentProgress) * 0.15; // Ease towards 95%
            setProgress(currentProgress);
        }, 500);

        try {
            // Call the bulk fetch server action with the resolved tokens
            const allResults = await fetchClassResults(
                regNos, 
                apiYear, 
                apiSemester, 
                apiExamHeld, 
                captchaToken, 
                manualToken
            );
            
            clearInterval(progressInterval);
            setProgress(100);
            setStatusMessage("Completed!");
            
            setResults(allResults);

            // Reset recaptcha widget for next fetch if captcha was used
            if (captchaToken && typeof window !== "undefined" && (window as any).grecaptcha) {
                (window as any).grecaptcha.reset();
                setCaptchaToken("");
            }
        } catch (error) {
            clearInterval(progressInterval);
            setProgress(0);
            setStatusMessage("An error occurred while fetching.");
        } finally {
            // Give the UI a moment to show 100% before hiding the progress bar
            setTimeout(() => {
                setIsFetching(false);
            }, 600);
        }
    };

    const currentBranch = BRANCH_DATA.find((b) => b.code === selectedBranch);
    const availableBranches = selectedBatch
        ? BRANCH_DATA.filter((b) => b.batchIds.includes(selectedBatch))
        : [];

    if (!isMounted) {
        return (
            <div className="space-y-8 animate-pulse">
                <Card className="border-2 shadow-sm">
                    <CardHeader className="bg-muted/50 pb-4 h-16"></CardHeader>
                    <CardContent className="h-32"></CardContent>
                </Card>
            </div>
        );
    }

    // ── Dynamic Branding Helpers
    const hasResults = results.length > 0;
    const dynamicCollegeName = hasResults ? results[0].college_name : "MIT MUZAFFARPUR";
    const dynamicBranchName = hasResults ? results[0].course : (currentBranch?.name || "Unknown Branch");

    return (
        <div className="space-y-8">
            {/* ── Dynamic Page Header ───────────────────────────────────── */}
            <header className="flex flex-col items-center space-y-6 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-tertiary rounded-full translate-x-2 translate-y-2 border-2 border-border" />
                <div className="relative p-6 bg-white rounded-full border-2 border-border shadow-pop hover:-rotate-6 transition-transform duration-300 cursor-pointer">
                  <GraduationCap className="h-14 w-14 text-accent" strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="space-y-4 relative">
                <h1 className="text-3xl font-heading font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground uppercase max-w-4xl px-4 leading-tight">
                  {hasResults ? (
                    <span className="text-white bg-accent px-4 py-1 border-2 border-border inline-block -rotate-1 shadow-pop">{dynamicCollegeName}</span>
                  ) : (
                    <>
                      MIT Result <span className="text-white bg-accent px-4 py-1 border-2 border-border inline-block -rotate-2 shadow-pop">Fetcher</span>
                    </>
                  )}
                </h1>
                <p className="text-foreground max-w-[700px] mx-auto text-base md:text-lg font-bold px-4 py-2.5 bg-white/80 border-2 border-border shadow-[4px_4px_0px_#FBBF24] rounded-xl transform rotate-0.5">
                  {hasResults ? (
                    <span>
                      Course: <strong className="text-accent">{dynamicBranchName}</strong> | Semester: <strong className="text-secondary">{results[0].semester}</strong> | Exam: <strong className="text-quaternary">{results[0].exam_held}</strong>
                    </span>
                  ) : (
                    "Instantly fetch and analyze class results for Bihar Engineering University."
                  )}
                </p>
              </div>
            </header>

            {/* ── Configuration Panel Card ──────────────────────────────── */}
            <Card className="border-2 shadow-pop hover:-rotate-0.5 hover:scale-[1.005] transition-all duration-300 bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 pointer-events-none" />
                <CardHeader className="bg-muted/50 pb-4 border-b-2 border-border">
                    <CardTitle className="text-xl">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col gap-6">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-end w-full">
                        <div className="flex-1 space-y-3">
                            <label className="text-sm font-bold text-foreground uppercase tracking-wider">
                                Select Batch / Semester
                            </label>
                            <Select
                                value={selectedBatch}
                                onValueChange={(val) => {
                                    setSelectedBatch(val);
                                    setSelectedBranch(""); // Reset branch when batch changes
                                }}
                                disabled={isFetching}
                            >
                                <SelectTrigger className="h-11 border-2 border-border font-bold">
                                    <SelectValue placeholder="Select a batch" />
                                </SelectTrigger>
                                <SelectContent className="border-2 border-border">
                                    {BATCH_CONFIGS.map((batch) => (
                                        <SelectItem key={batch.id} value={batch.id} className="font-semibold">
                                            {batch.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 space-y-3">
                            <label className="text-sm font-bold text-foreground uppercase tracking-wider">
                                Select Branch
                            </label>
                            <Select
                                value={selectedBranch}
                                onValueChange={setSelectedBranch}
                                disabled={isFetching || !selectedBatch}
                            >
                                <SelectTrigger className="h-11 border-2 border-border font-bold">
                                    <SelectValue placeholder="Select a branch" />
                                </SelectTrigger>
                                <SelectContent className="border-2 border-border">
                                    {availableBranches.map((branch) => (
                                        <SelectItem key={branch.code} value={branch.code} className="font-semibold">
                                            {branch.name} ({branch.count} Students)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={handleFetch}
                            disabled={!selectedBranch || !selectedBatch || isFetching}
                            className="h-11 px-8 text-base font-bold transition-all active:scale-95 border-2 border-border shadow-pop bg-accent hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isFetching ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Fetching...
                                </>
                            ) : (
                                "Fetch Results"
                            )}
                        </Button>
                    </div>

                    <div className="flex flex-col gap-4 border-t-2 border-dashed border-border pt-6 mt-2">
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                            {isAutoCaptcha ? (
                                <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[120px] bg-accent/5 border-2 border-dashed border-accent/40 rounded-xl p-4 text-center">
                                    <span className="text-2xl">🤖</span>
                                    <span className="text-sm font-extrabold text-accent uppercase tracking-wider mt-1">Auto-Captcha Solver Active</span>
                                    <p className="text-[11px] text-muted-foreground mt-1 font-semibold leading-relaxed">
                                        Server-side 2Captcha integration is configured. Fetch will proceed automatically with no manual CAPTCHA solving.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[120px] bg-muted/20 border-2 border-border rounded-xl p-4">
                                    <span className="text-xs font-extrabold text-foreground mb-3 uppercase tracking-wider">Verification Required</span>
                                    <div id="recaptcha-container-dashboard" className="flex justify-center" />
                                    {captchaToken && (
                                        <span className="text-xs text-green-600 font-bold mt-2">✓ CAPTCHA Completed</span>
                                    )}
                                </div>
                            )}
                            
                            <div className="flex-1 w-full space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">Optional: Bypass / Manual Token</span>
                                    <button 
                                        type="button"
                                        onClick={() => setShowManualInput(!showManualInput)}
                                        className="text-xs font-extrabold text-accent underline hover:text-accent/80 uppercase tracking-wide cursor-pointer"
                                    >
                                        {showManualInput ? "Hide Override" : "Use Manual Token"}
                                    </button>
                                </div>
                                {showManualInput ? (
                                    <div className="space-y-2">
                                        <Input
                                            type="text"
                                            placeholder="Paste result token (from network tab)..."
                                            value={manualToken}
                                            onChange={(e) => setManualToken(e.target.value)}
                                            className="h-11 border-2 border-border font-mono text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-white focus-visible:ring-0 focus-visible:border-black"
                                            disabled={isFetching}
                                        />
                                        <p className="text-[10px] font-semibold text-muted-foreground leading-normal">
                                            How to get: Go to the <a href="https://beu-bih.ac.in/" target="_blank" rel="noopener noreferrer" className="underline text-accent">BEU Website</a>, solve the captcha, and click search. Open Developer Tools (F12) &gt; Network tab. Look for a request named <code className="bg-muted px-1 py-0.5 rounded">get-result</code> and copy the <code className="bg-muted px-1 py-0.5 rounded">token</code> value from its query parameters.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                                        {isAutoCaptcha 
                                            ? "Automatic bypass mode is enabled. No manual actions are required from your side."
                                            : "Solving the CAPTCHA is required to exchange and fetch results securely from the BEU backend. If domain constraints prevent the widget from loading, click the button above to paste a manual token."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isFetching && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm font-medium text-muted-foreground gap-2">
                        <span className="font-bold text-foreground">{statusMessage}</span>
                        <span className="font-mono bg-muted border border-border px-2 py-0.5 rounded text-xs w-fit">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-3 border-2 border-border" />
                    {isMultiStep && (
                        <div className="flex justify-end pt-1">
                            <Button 
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    setIsMultiStep(false);
                                    setIsFetching(false);
                                    setStatusMessage("Fetching stopped by user.");
                                    if (typeof window !== "undefined" && (window as any).grecaptcha) {
                                        try {
                                            (window as any).grecaptcha.reset();
                                        } catch (e) {
                                            console.error("Error resetting reCAPTCHA:", e);
                                        }
                                    }
                                }}
                                className="h-9 px-4 font-bold border-2 border-border shadow-pop bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95"
                            >
                                Stop Fetching
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {results.length > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <ClassSummary
                        results={results}
                        totalStudents={results.length}
                    />

                    <div className="flex justify-center space-x-2 p-1.5 bg-white border-2 border-border rounded-full w-fit mx-auto shadow-pop-soft">
                        <button
                            onClick={() => setActiveTab("table")}
                            className={cn(
                                "px-4 sm:px-8 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all uppercase tracking-wider",
                                activeTab === "table"
                                    ? "bg-accent text-accent-foreground shadow-pop"
                                    : "text-foreground hover:bg-tertiary hover:text-tertiary-foreground"
                            )}
                        >
                            Result Table
                        </button>
                        <button
                            onClick={() => setActiveTab("analytics")}
                            className={cn(
                                "px-4 sm:px-8 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all uppercase tracking-wider",
                                activeTab === "analytics"
                                    ? "bg-secondary text-secondary-foreground shadow-pop"
                                    : "text-foreground hover:bg-tertiary hover:text-tertiary-foreground"
                            )}
                        >
                            Analytics 📊
                        </button>
                    </div>

                    {activeTab === "table" ? (
                        <ResultTable
                            results={results}
                            branchName={dynamicBranchName}
                            examId={resolvedExamIdState}
                        />
                    ) : (
                        <AnalysisSection
                            results={results}
                            branchName={dynamicBranchName}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
