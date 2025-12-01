import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentResult } from "@/types";
import { Users, CheckCircle2, TrendingUp, Activity } from "lucide-react";

interface ClassSummaryProps {
    results: StudentResult[];
    totalStudents: number; // Kept for interface compatibility but not used in display
}

export function ClassSummary({ results, totalStudents }: ClassSummaryProps) {
    const fetchedCount = results.length;

    // Logic:
    // Pass: fail_any === "PASS"
    // Fail (Year Back): CGPA < 5
    // Paper Back (Promoted): fail_any !== "PASS" && CGPA >= 5

    let passedCount = 0;
    let failedCount = 0;
    let backlogCount = 0;
    let totalSgpa = 0;
    let totalCgpa = 0;
    let sgpaCount = 0;
    let cgpaCount = 0;

    results.forEach((r) => {
        // Stats
        const sgpa = parseFloat(r.sgpa[2] || "0");
        if (!isNaN(sgpa) && sgpa > 0) {
            totalSgpa += sgpa;
            sgpaCount++;
        }

        // Use effective CGPA logic (fallback to SGPA if CGPA is missing/0)
        let cgpa = parseFloat(r.cgpa);
        if (isNaN(cgpa) || cgpa === 0) {
            cgpa = sgpa; // Fallback
        }

        if (!isNaN(cgpa) && cgpa > 0) {
            totalCgpa += cgpa;
            cgpaCount++;
        }

        // Status Counts
        if (r.fail_any === "PASS") {
            passedCount++;
        } else if (cgpa < 5) {
            failedCount++;
        } else {
            backlogCount++;
        }
    });

    const avgSgpa = sgpaCount > 0 ? (totalSgpa / sgpaCount).toFixed(2) : "N/A";
    const avgCgpa = cgpaCount > 0 ? (totalCgpa / cgpaCount).toFixed(2) : "N/A";

    const passPercentage =
        fetchedCount > 0 ? ((passedCount / fetchedCount) * 100).toFixed(1) : "0";

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{fetchedCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Processed Results
                    </p>
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pass Percentage</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{passPercentage}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {passedCount} Pass, {backlogCount} Prom, {failedCount} Fail
                    </p>
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Average SGPA</CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{avgSgpa}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        For 3rd Semester
                    </p>
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Average CGPA</CardTitle>
                    <Activity className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{avgCgpa}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Cumulative Performance
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
