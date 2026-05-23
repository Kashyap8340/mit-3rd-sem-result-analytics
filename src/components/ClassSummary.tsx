import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentResult } from "@/types";
import { Users, CheckCircle2, TrendingUp, Activity } from "lucide-react";
import { getCurrentSgpa, getEffectiveCgpa } from "@/lib/utils";

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
        const sgpa = getCurrentSgpa(r);
        if (!isNaN(sgpa) && sgpa > 0) {
            totalSgpa += sgpa;
            sgpaCount++;
        }

        // Use effective CGPA logic
        const cgpa = getEffectiveCgpa(r);

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
            <Card className="border-t-4 border-t-accent shadow-pop hover:-translate-y-1 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Total Students</CardTitle>
                    <div className="bg-accent/10 p-2 rounded-full border-2 border-border">
                        <Users className="h-5 w-5 text-accent" strokeWidth={2.5} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-extrabold font-heading text-foreground">{fetchedCount}</div>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                        Processed Results
                    </p>
                </CardContent>
            </Card>
            <Card className="border-t-4 border-t-quaternary shadow-pop hover:-translate-y-1 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Pass Percentage</CardTitle>
                    <div className="bg-quaternary/10 p-2 rounded-full border-2 border-border">
                        <CheckCircle2 className="h-5 w-5 text-quaternary" strokeWidth={2.5} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-extrabold font-heading text-foreground">{passPercentage}%</div>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {passedCount} Pass, {backlogCount} Prom, {failedCount} Fail
                    </p>
                </CardContent>
            </Card>
            <Card className="border-t-4 border-t-secondary shadow-pop hover:-translate-y-1 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Average SGPA</CardTitle>
                    <div className="bg-secondary/10 p-2 rounded-full border-2 border-border">
                        <TrendingUp className="h-5 w-5 text-secondary" strokeWidth={2.5} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-extrabold font-heading text-foreground">{avgSgpa}</div>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                        For Current Semester
                    </p>
                </CardContent>
            </Card>
            <Card className="border-t-4 border-t-tertiary shadow-pop hover:-translate-y-1 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Average CGPA</CardTitle>
                    <div className="bg-tertiary/10 p-2 rounded-full border-2 border-border">
                        <Activity className="h-5 w-5 text-tertiary" strokeWidth={2.5} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-extrabold font-heading text-foreground">{avgCgpa}</div>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                        Cumulative Performance
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
