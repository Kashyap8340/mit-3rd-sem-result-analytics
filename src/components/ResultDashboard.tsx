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

const ResultTable = dynamic(() => import("@/components/ResultTable").then(mod => mod.ResultTable), { ssr: false });
const AnalysisSection = dynamic(() => import("@/components/AnalysisSection").then(mod => mod.AnalysisSection), { ssr: false });
import { BRANCH_DATA, BATCH_CONFIGS, generateRegistrationNumbers } from "@/lib/utils";
import { fetchClassResults } from "@/app/actions";
import { StudentResult } from "@/types";
import { Loader2 } from "lucide-react";
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

    useEffect(() => {
        setIsMounted(true);
    }, []);

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

    const handleFetch = async () => {
        if (!selectedBranch || !selectedBatch) return;

        const branch = BRANCH_DATA.find((b) => b.code === selectedBranch);
        const batchConfig = BATCH_CONFIGS.find((b) => b.id === selectedBatch);
        if (!branch || !batchConfig) return;

        setIsFetching(true);
        setResults([]);
        setProgress(0);
        setStatusMessage("Initializing...");
        setActiveTab("table"); // Reset to table view on new fetch

        const regNos = generateRegistrationNumbers(branch.code, branch.count, batchConfig.id);
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
            const allResults = await fetchClassResults(regNos, batchConfig.apiYear, batchConfig.apiSemester, batchConfig.apiExamHeld);
            
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

    return (
        <div className="space-y-8">
            <Card className="border-2 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardHeader className="bg-muted/50 pb-4">
                    <CardTitle className="text-xl">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col gap-6 sm:flex-row sm:items-end w-full">
                    <div className="flex-1 space-y-3">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select a batch" />
                            </SelectTrigger>
                            <SelectContent>
                                {BATCH_CONFIGS.map((batch) => (
                                    <SelectItem key={batch.id} value={batch.id}>
                                        {batch.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 space-y-3">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Select Branch
                        </label>
                        <Select
                            value={selectedBranch}
                            onValueChange={setSelectedBranch}
                            disabled={isFetching || !selectedBatch}
                        >
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select a branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableBranches.map((branch) => (
                                    <SelectItem key={branch.code} value={branch.code}>
                                        {branch.name} ({branch.count} Students)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={handleFetch}
                        disabled={!selectedBranch || !selectedBatch || isFetching}
                        className="h-11 px-8 text-base font-medium transition-all active:scale-95"
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
                        totalStudents={currentBranch?.count || 0}
                    />

                    <div className="flex justify-center space-x-4 p-1 bg-muted/50 rounded-lg w-fit mx-auto">
                        <button
                            onClick={() => setActiveTab("table")}
                            className={cn(
                                "px-6 py-2 rounded-md text-sm font-medium transition-all",
                                activeTab === "table"
                                    ? "bg-white shadow text-primary"
                                    : "text-muted-foreground hover:text-primary"
                            )}
                        >
                            Result Table
                        </button>
                        <button
                            onClick={() => setActiveTab("analytics")}
                            className={cn(
                                "px-6 py-2 rounded-md text-sm font-medium transition-all",
                                activeTab === "analytics"
                                    ? "bg-white shadow text-primary"
                                    : "text-muted-foreground hover:text-primary"
                            )}
                        >
                            Analytics 📊
                        </button>
                    </div>

                    {activeTab === "table" ? (
                        <ResultTable
                            results={results}
                            branchName={currentBranch?.name || "Unknown Branch"}
                        />
                    ) : (
                        <AnalysisSection
                            results={results}
                            branchName={currentBranch?.name || "Unknown Branch"}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
