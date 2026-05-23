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
import { fetchClassResults } from "@/app/actions";
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

    // ── Advanced Mode States
    const [collegeCode, setCollegeCode] = useState<string>("107");
    const [customBranchCode, setCustomBranchCode] = useState<string>("105");
    const [customBranchName, setCustomBranchName] = useState<string>("Computer Science (CSE)");
    const [customStartRoll, setCustomStartRoll] = useState<number>(1);
    const [customEndRoll, setCustomEndRoll] = useState<number>(60);
    const [lateralEnabled, setLateralEnabled] = useState<boolean>(true);
    const [lateralStartRoll, setLateralStartRoll] = useState<number>(901);
    const [lateralEndRoll, setLateralEndRoll] = useState<number>(920);
    const [customApiYear, setCustomApiYear] = useState<string>("2025");
    const [customApiSemester, setCustomApiSemester] = useState<string>("I");
    const [customApiExamHeld, setCustomApiExamHeld] = useState<string>("January/2026");
    const [customRegPrefix, setCustomRegPrefix] = useState<string>("25");
    const [customLateralPrefix, setCustomLateralPrefix] = useState<string>("26");
    const [isAdvanced, setIsAdvanced] = useState<boolean>(false);

    // ── Load custom settings on mount
    useEffect(() => {
        setIsMounted(true);
        try {
            const saved = localStorage.getItem("beu_custom_settings");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.collegeCode) setCollegeCode(parsed.collegeCode);
                if (parsed.customBranchCode) setCustomBranchCode(parsed.customBranchCode);
                if (parsed.customBranchName) setCustomBranchName(parsed.customBranchName);
                if (parsed.customStartRoll !== undefined) setCustomStartRoll(Number(parsed.customStartRoll));
                if (parsed.customEndRoll !== undefined) setCustomEndRoll(Number(parsed.customEndRoll));
                if (parsed.lateralEnabled !== undefined) setLateralEnabled(Boolean(parsed.lateralEnabled));
                if (parsed.lateralStartRoll !== undefined) setLateralStartRoll(Number(parsed.lateralStartRoll));
                if (parsed.lateralEndRoll !== undefined) setLateralEndRoll(Number(parsed.lateralEndRoll));
                if (parsed.customApiYear) setCustomApiYear(parsed.customApiYear);
                if (parsed.customApiSemester) setCustomApiSemester(parsed.customApiSemester);
                if (parsed.customApiExamHeld) setCustomApiExamHeld(parsed.customApiExamHeld);
                if (parsed.customRegPrefix) setCustomRegPrefix(parsed.customRegPrefix);
                if (parsed.customLateralPrefix) setCustomLateralPrefix(parsed.customLateralPrefix);
                if (parsed.isAdvanced !== undefined) setIsAdvanced(Boolean(parsed.isAdvanced));
            }
        } catch (e) {
            console.error("Failed to load saved settings:", e);
        }
    }, []);

    // ── Save settings helper
    const saveSettings = () => {
        try {
            const settings = {
                collegeCode,
                customBranchCode,
                customBranchName,
                customStartRoll,
                customEndRoll,
                lateralEnabled,
                lateralStartRoll,
                lateralEndRoll,
                customApiYear,
                customApiSemester,
                customApiExamHeld,
                customRegPrefix,
                customLateralPrefix,
                isAdvanced
            };
            localStorage.setItem("beu_custom_settings", JSON.stringify(settings));
        } catch (e) {
            console.error("Failed to save settings:", e);
        }
    };

    // ── Pre-fill advanced configurations from dropdown presets
    useEffect(() => {
        if (!selectedBatch) return;
        const config = BATCH_CONFIGS.find(b => b.id === selectedBatch);
        if (config) {
            setCustomApiYear(config.apiYear);
            setCustomApiSemester(Array.isArray(config.apiSemester) ? config.apiSemester[0] : config.apiSemester);
            setCustomApiExamHeld(config.apiExamHeld);
            setCustomRegPrefix(config.regPrefix);
            setCustomLateralPrefix(config.lateralPrefix);
        }
    }, [selectedBatch]);

    useEffect(() => {
        if (!selectedBranch) return;
        const branch = BRANCH_DATA.find(b => b.code === selectedBranch);
        if (branch) {
            setCustomBranchCode(branch.code);
            setCustomBranchName(branch.name);
            setCustomEndRoll(branch.count);
        }
    }, [selectedBranch]);

    const handleFetch = async () => {
        if (!isAdvanced) {
            if (!selectedBranch || !selectedBatch) return;
        } else {
            if (!customBranchCode || !collegeCode || !customApiYear || !customApiSemester || !customApiExamHeld) return;
        }

        setIsFetching(true);
        setResults([]);
        setProgress(0);
        setStatusMessage("Initializing...");
        setActiveTab("table"); // Reset to table view on new fetch

        let regNos: string[] = [];
        let apiYear: string = "";
        let apiSemester: string | string[] = "";
        let apiExamHeld: string = "";

        if (isAdvanced) {
            saveSettings();
            const customBatch: any = {
                id: "custom",
                label: `Custom Batch (Sem ${customApiSemester})`,
                apiYear: customApiYear,
                apiSemester: customApiSemester,
                apiExamHeld: customApiExamHeld,
                regPrefix: customRegPrefix,
                lateralPrefix: customLateralPrefix
            };
            
            regNos = generateRegistrationNumbers(
                customBranchCode,
                customEndRoll,
                "custom",
                collegeCode,
                customBatch,
                { start: customStartRoll, end: customEndRoll },
                { start: lateralStartRoll, end: lateralEndRoll, enabled: lateralEnabled }
            );
            apiYear = customApiYear;
            apiSemester = customApiSemester;
            apiExamHeld = customApiExamHeld;
        } else {
            const branch = BRANCH_DATA.find((b) => b.code === selectedBranch);
            const batchConfig = BATCH_CONFIGS.find((b) => b.id === selectedBatch);
            if (!branch || !batchConfig) return;

            regNos = generateRegistrationNumbers(branch.code, branch.count, batchConfig.id);
            apiYear = batchConfig.apiYear;
            apiSemester = batchConfig.apiSemester;
            apiExamHeld = batchConfig.apiExamHeld;
        }

        const total = regNos.length;

        // Start a fake progress interval while waiting for the single server action
        let currentProgress = 5;
        setProgress(currentProgress);
        setStatusMessage("Fetching results securely from server cache...");
        
        const progressInterval = setInterval(() => {
            currentProgress += (100 - currentProgress) * 0.15; // Ease towards 95%
            setProgress(currentProgress);
        }, 500);

        try {
            // Call the bulk fetch server action
            const allResults = await fetchClassResults(regNos, apiYear, apiSemester, apiExamHeld);
            
            clearInterval(progressInterval);
            setProgress(100);
            setStatusMessage("Completed!");
            
            setResults(allResults);
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
    const dynamicBranchName = hasResults ? results[0].course : (currentBranch?.name || customBranchName || "Unknown Branch");

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
                <CardHeader className="bg-muted/50 pb-4 border-b-2 border-border flex flex-row items-center justify-between">
                    <CardTitle className="text-xl">Configuration</CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setIsAdvanced(!isAdvanced);
                            saveSettings();
                        }}
                        className="text-xs font-bold border-2 border-border shadow-pop-soft hover:bg-slate-50 transition-all active:scale-95"
                    >
                        {isAdvanced ? "⚡ Switch to Standard Mode" : "⚙️ Advanced Settings"}
                    </Button>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col gap-6">
                    {/* Standard Mode Dropdowns */}
                    {!isAdvanced && (
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
                                className="h-11 px-8 text-base font-bold transition-all active:scale-95 border-2 border-border shadow-pop bg-accent hover:bg-accent/90"
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
                    )}

                    {/* Advanced Custom Query Mode Form */}
                    {isAdvanced && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-xs font-medium text-yellow-800">
                                💡 <strong>Advanced Mode:</strong> Pre-filled from dropdown presets. Change the values below to fetch data for other BEU engineering colleges (e.g. 108 BCE Bhagalpur, 109 Gaya) and custom range bounds.
                            </div>

                            <div className="grid gap-6 md:grid-cols-3">
                                {/* Col 1: College & Branch Settings */}
                                <div className="space-y-4 p-4 border-2 border-border rounded-2xl bg-slate-50/50 shadow-sm">
                                    <h3 className="font-bold text-sm text-accent uppercase tracking-wider border-b-2 border-border pb-1">College & Branch</h3>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700">College Code (e.g. 107 MIT)</label>
                                        <Input
                                            value={collegeCode}
                                            onChange={(e) => setCollegeCode(e.target.value)}
                                            placeholder="107"
                                            className="h-10 border-2 border-border font-bold bg-white"
                                            disabled={isFetching}
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700">Branch Code (3-digit)</label>
                                        <Input
                                            value={customBranchCode}
                                            onChange={(e) => setCustomBranchCode(e.target.value)}
                                            placeholder="105"
                                            className="h-10 border-2 border-border font-bold bg-white"
                                            disabled={isFetching}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700">Branch Label (For Charts)</label>
                                        <Input
                                            value={customBranchName}
                                            onChange={(e) => setCustomBranchName(e.target.value)}
                                            placeholder="Computer Science (CSE)"
                                            className="h-10 border-2 border-border font-bold bg-white"
                                            disabled={isFetching}
                                        />
                                    </div>
                                </div>

                                {/* Col 2: Student Range & Lateral Entry */}
                                <div className="space-y-4 p-4 border-2 border-border rounded-2xl bg-slate-50/50 shadow-sm">
                                    <h3 className="font-bold text-sm text-secondary uppercase tracking-wider border-b-2 border-border pb-1">Roll Bounds</h3>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700">Start Roll</label>
                                            <Input
                                                type="number"
                                                value={customStartRoll}
                                                onChange={(e) => setCustomStartRoll(Number(e.target.value))}
                                                className="h-10 border-2 border-border font-bold bg-white"
                                                disabled={isFetching}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700">End Roll</label>
                                            <Input
                                                type="number"
                                                value={customEndRoll}
                                                onChange={(e) => setCustomEndRoll(Number(e.target.value))}
                                                className="h-10 border-2 border-border font-bold bg-white"
                                                disabled={isFetching}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="lateralEnabled"
                                                checked={lateralEnabled}
                                                onChange={(e) => setLateralEnabled(e.target.checked)}
                                                className="h-4 w-4 rounded border-2 border-border text-accent focus:ring-accent"
                                                disabled={isFetching}
                                            />
                                            <label htmlFor="lateralEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                                Include Lateral Entry
                                            </label>
                                        </div>
                                    </div>

                                    {lateralEnabled && (
                                        <div className="grid grid-cols-2 gap-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-600">Lat Start</label>
                                                <Input
                                                    type="number"
                                                    value={lateralStartRoll}
                                                    onChange={(e) => setLateralStartRoll(Number(e.target.value))}
                                                    className="h-9 border-2 border-border font-bold bg-white"
                                                    disabled={isFetching}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-600">Lat End</label>
                                                <Input
                                                    type="number"
                                                    value={lateralEndRoll}
                                                    onChange={(e) => setLateralEndRoll(Number(e.target.value))}
                                                    className="h-9 border-2 border-border font-bold bg-white"
                                                    disabled={isFetching}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Col 3: API Backend Query Parameters */}
                                <div className="space-y-4 p-4 border-2 border-border rounded-2xl bg-slate-50/50 shadow-sm">
                                    <h3 className="font-bold text-sm text-quaternary uppercase tracking-wider border-b-2 border-border pb-1">BEU API Settings</h3>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700">Exam Year</label>
                                            <Input
                                                value={customApiYear}
                                                onChange={(e) => setCustomApiYear(e.target.value)}
                                                placeholder="2025"
                                                className="h-10 border-2 border-border font-bold bg-white"
                                                disabled={isFetching}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700">Semester</label>
                                            <Input
                                                value={customApiSemester}
                                                onChange={(e) => setCustomApiSemester(e.target.value)}
                                                placeholder="I"
                                                className="h-10 border-2 border-border font-bold bg-white"
                                                disabled={isFetching}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700">Exam Held Month/Year</label>
                                        <Input
                                            value={customApiExamHeld}
                                            onChange={(e) => setCustomApiExamHeld(e.target.value)}
                                            placeholder="January/2026"
                                            className="h-10 border-2 border-border font-bold bg-white"
                                            disabled={isFetching}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-600">Reg Prefix</label>
                                            <Input
                                                value={customRegPrefix}
                                                onChange={(e) => setCustomRegPrefix(e.target.value)}
                                                placeholder="25"
                                                className="h-9 border-2 border-border font-bold bg-white"
                                                disabled={isFetching}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-600">Lateral Prefix</label>
                                            <Input
                                                value={customLateralPrefix}
                                                onChange={(e) => setCustomLateralPrefix(e.target.value)}
                                                placeholder="26"
                                                className="h-9 border-2 border-border font-bold bg-white"
                                                disabled={isFetching}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t-2 border-border">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        // Reset advanced inputs to current dropdown selections
                                        const config = BATCH_CONFIGS.find(b => b.id === selectedBatch);
                                        const branch = BRANCH_DATA.find(b => b.code === selectedBranch);
                                        if (config) {
                                            setCustomApiYear(config.apiYear);
                                            setCustomApiSemester(Array.isArray(config.apiSemester) ? config.apiSemester[0] : config.apiSemester);
                                            setCustomApiExamHeld(config.apiExamHeld);
                                            setCustomRegPrefix(config.regPrefix);
                                            setCustomLateralPrefix(config.lateralPrefix);
                                        }
                                        if (branch) {
                                            setCustomBranchCode(branch.code);
                                            setCustomBranchName(branch.name);
                                            setCustomEndRoll(branch.count);
                                        }
                                        setCollegeCode("107");
                                        setCustomStartRoll(1);
                                        setLateralEnabled(true);
                                        setLateralStartRoll(901);
                                        setLateralEndRoll(920);
                                    }}
                                    disabled={isFetching}
                                    className="h-11 px-6 font-bold border-2 border-border"
                                >
                                    Reset inputs
                                </Button>
                                <Button
                                    onClick={handleFetch}
                                    disabled={isFetching || !customBranchCode || !collegeCode || !customApiYear || !customApiSemester || !customApiExamHeld}
                                    className="h-11 px-8 text-base font-bold transition-all active:scale-95 border-2 border-border shadow-pop bg-accent hover:bg-accent/90 text-white"
                                >
                                    {isFetching ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Fetching Class...
                                        </>
                                    ) : (
                                        "Fetch Custom Results ⚡"
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isFetching && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between text-sm font-medium text-muted-foreground">
                        <span>{statusMessage}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
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
