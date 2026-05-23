"use client";

import { StudentResult } from "@/types";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    ReferenceLine,
    AreaChart,
    Area
} from "recharts";
import { StudentAIChat } from "./StudentAIChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, getCurrentSgpa, getEffectiveCgpa, getSemesterIndex } from "@/lib/utils";

interface AnalysisSectionProps {
    results: StudentResult[];
    branchName: string;
}

const COLORS = ["#34D399", "#FBBF24", "#F472B6"]; // Mint, Yellow, Pink

export function AnalysisSection({ results, branchName }: AnalysisSectionProps) {
    const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("all");
    const [selectedStudentReg, setSelectedStudentReg] = useState<string>("");
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // 1. SGPA Distribution
    const sgpaDistribution = [
        { name: "< 6.0", count: 0 },
        { name: "6.0-6.9", count: 0 },
        { name: "7.0-7.9", count: 0 },
        { name: "8.0-8.9", count: 0 },
        { name: "≥ 9.0", count: 0 },
    ];

    // 2. Result Status Breakdown
    let passCount = 0;
    let promotedCount = 0;
    let failCount = 0;

    // 3. Killer Subjects Analysis
    const subjectStats: Record<string, { name: string; code: string; total: number; failed: number }> = {};

    // 4. Branch Performance (Mean SGPA)
    let totalSgpa = 0;
    let sgpaCount = 0;
    const sgpaValues: number[] = [];

    // CGPA Stats
    let totalCgpa = 0;
    let cgpaCount = 0;
    const cgpaValues: number[] = [];

    // 7. Subject Wise Performance Data Collection
    const subjectPerformance: Record<string, {
        name: string;
        code: string;
        totalMarks: number;
        count: number;
        passed: number;
        scores: { name: string; marks: number }[];
        grades: Record<string, number>;
    }> = {};

    results.forEach((student) => {
        // SGPA Dist
        const sgpa = getCurrentSgpa(student);
        if (!isNaN(sgpa) && sgpa > 0) {
            totalSgpa += sgpa;
            sgpaCount++;
            sgpaValues.push(sgpa);

            if (sgpa < 6.0) sgpaDistribution[0].count++;
            else if (sgpa < 7.0) sgpaDistribution[1].count++;
            else if (sgpa < 8.0) sgpaDistribution[2].count++;
            else if (sgpa < 9.0) sgpaDistribution[3].count++;
            else sgpaDistribution[4].count++;
        }

        // Status
        const cgpaVal = parseFloat(student.cgpa);
        let status = student.fail_any;
        if (status !== "PASS") {
            const effectiveCgpa = getEffectiveCgpa(student);

            if (effectiveCgpa < 5) status = "FAIL";
            else status = "PROMOTED";
        }

        if (status === "PASS") passCount++;
        else if (status === "PROMOTED") promotedCount++;
        else failCount++;

        // CGPA Stats Collection
        if (!isNaN(cgpaVal) && cgpaVal > 0) {
            totalCgpa += cgpaVal;
            cgpaCount++;
            cgpaValues.push(cgpaVal);
        }

        // Killer Subjects & Subject Performance
        const allSubjects = [...(student.theorySubjects || []), ...(student.practicalSubjects || [])];
        allSubjects.forEach((sub) => {
            // Killer Subjects Stats
            if (!subjectStats[sub.code]) {
                subjectStats[sub.code] = { name: sub.name, code: sub.code, total: 0, failed: 0 };
            }
            subjectStats[sub.code].total++;
            if (sub.grade === "F" || sub.grade === "Absent" || sub.grade === "Fail") {
                subjectStats[sub.code].failed++;
            }

            // Subject Performance Stats
            if (!subjectPerformance[sub.code]) {
                subjectPerformance[sub.code] = {
                    name: sub.name,
                    code: sub.code,
                    totalMarks: 0,
                    count: 0,
                    passed: 0,
                    scores: [],
                    grades: { O: 0, "A+": 0, A: 0, "B+": 0, B: 0, C: 0, P: 0, F: 0, Absent: 0, Fail: 0 }
                };
            }
            const marks = parseFloat(sub.total);
            if (!isNaN(marks)) {
                subjectPerformance[sub.code].totalMarks += marks;
                subjectPerformance[sub.code].count++;
                subjectPerformance[sub.code].scores.push({ name: student.name, marks });
            }
            if (sub.grade !== "F" && sub.grade !== "Absent" && sub.grade !== "Fail") {
                subjectPerformance[sub.code].passed++;
            }

            // Grade Count
            const grade = sub.grade || "F";
            if (subjectPerformance[sub.code].grades[grade] !== undefined) {
                subjectPerformance[sub.code].grades[grade]++;
            } else {
                subjectPerformance[sub.code].grades[grade] = (subjectPerformance[sub.code].grades[grade] || 0) + 1;
            }
        });
    });

    const statusData = [
        { name: "PASS", value: passCount },
        { name: "PROMOTED", value: promotedCount },
        { name: "FAIL", value: failCount },
    ];

    const killerSubjects = Object.values(subjectStats)
        .map((s) => ({
            name: s.name,
            code: s.code || s.name,
            failRate: s.total > 0 ? (s.failed / s.total) * 100 : 0,
        }))
        .sort((a, b) => b.failRate - a.failRate)
        .slice(0, 5);

    const meanSgpa = sgpaCount > 0 ? totalSgpa / sgpaCount : 0;

    // Calculate Standard Deviation for Z-Score
    const variance = sgpaValues.reduce((acc, val) => acc + Math.pow(val - meanSgpa, 2), 0) / sgpaCount;
    const stdDev = Math.sqrt(variance);

    const meanCgpa = cgpaCount > 0 ? totalCgpa / cgpaCount : 0;
    const varianceCgpa = cgpaValues.reduce((acc, val) => acc + Math.pow(val - meanCgpa, 2), 0) / cgpaCount;
    const stdDevCgpa = Math.sqrt(varianceCgpa);

    const branchComparisonData = [
        { name: "Current Branch", sgpa: meanSgpa },
        { name: "College Avg (Est)", sgpa: 7.5 },
    ];

    // 8. Normal Distribution (Bell Curve) Data
    const bellCurveData = useMemo(() => {
        if (sgpaCount === 0 || stdDev === 0) return [];
        
        const data = [];
        for (let x = 0; x <= 10; x += 0.1) {
            const xVal = parseFloat(x.toFixed(1));
            const exponent = -0.5 * Math.pow((xVal - meanSgpa) / stdDev, 2);
            const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
            
            data.push({
                sgpa: xVal,
                probability: parseFloat(y.toFixed(4)),
            });
        }
        return data;
    }, [meanSgpa, stdDev, sgpaCount]);

    // 5. Topper Summary (SGPA)
    const toppers = [...results]
        .sort((a, b) => getCurrentSgpa(b) - getCurrentSgpa(a))
        .slice(0, 5);

    // 6. Topper Summary (CGPA)
    const toppersCgpa = [...results]
        .sort((a, b) => {
            const cgpaA = parseFloat(a.cgpa) || 0;
            const cgpaB = parseFloat(b.cgpa) || 0;
            return cgpaB - cgpaA;
        })
        .slice(0, 5);

    // Process Subject Analysis
    const subjectAnalysis = Object.values(subjectPerformance).map(sub => {
        const avg = sub.count > 0 ? sub.totalMarks / sub.count : 0;
        const passRate = sub.count > 0 ? (sub.passed / sub.count) * 100 : 0;
        const topPerformers = sub.scores.sort((a, b) => b.marks - a.marks).slice(0, 7);
        const gradeDist = Object.entries(sub.grades).map(([name, value]) => ({ name, value }));
        return { ...sub, avg, passRate, topPerformers, gradeDist };
    });

    const subjectComparisonData = subjectAnalysis.map(s => ({
        name: s.code,
        fullName: s.name,
        avg: parseFloat(s.avg.toFixed(1))
    }));

    const selectedSubject = selectedSubjectCode === "all"
        ? subjectAnalysis[0]
        : subjectAnalysis.find(s => s.code === selectedSubjectCode) || subjectAnalysis[0];

    // --- Individual Student Analytics Logic ---
    const sortedStudents = useMemo(() => {
        return [...results].sort((a, b) => a.redg_no - b.redg_no);
    }, [results]);

    const selectedStudent = useMemo(() => {
        return sortedStudents.find(s => s.redg_no.toString() === selectedStudentReg);
    }, [sortedStudents, selectedStudentReg]);

    const studentMetrics = useMemo(() => {
        if (!selectedStudent) return null;

        const currentSgpa = getCurrentSgpa(selectedStudent);
        const currentCgpa = getEffectiveCgpa(selectedStudent);

        // Rank Calculation (based on SGPA for current sem context)
        const rank = results
            .sort((a, b) => getCurrentSgpa(b) - getCurrentSgpa(a))
            .findIndex(s => s.redg_no === selectedStudent.redg_no) + 1;

        const percentile = ((results.length - rank) / results.length) * 100;
        const zScore = stdDev > 0 ? (currentSgpa - meanSgpa) / stdDev : 0;

        // CGPA Rank & Z-Score
        const cgpaRank = results
            .sort((a, b) => (parseFloat(b.cgpa) || 0) - (parseFloat(a.cgpa) || 0))
            .findIndex(s => s.redg_no === selectedStudent.redg_no) + 1;

        const zScoreCgpa = stdDevCgpa > 0 ? (currentCgpa - meanCgpa) / stdDevCgpa : 0;

        // Subject Comparison
        const allStudentSubjects = [...(selectedStudent.theorySubjects || []), ...(selectedStudent.practicalSubjects || [])];
        const subjectDetails = allStudentSubjects.map(sub => {
            const classSubStats = subjectAnalysis.find(s => s.code === sub.code);
            const classAvg = classSubStats ? classSubStats.avg : 0;
            const bestScore = classSubStats ? classSubStats.topPerformers[0]?.marks || 0 : 0;

            // Sem Topper Score
            const semTopper = toppers[0];
            const semTopperSubject = semTopper ? [...(semTopper.theorySubjects || []), ...(semTopper.practicalSubjects || [])].find(s => s.code === sub.code) : null;
            const semTopperScore = semTopperSubject ? parseFloat(semTopperSubject.total) : 0;

            const marks = parseFloat(sub.total);

            return {
                ...sub,
                classAvg,
                bestScore,
                semTopperScore,
                diffFromAvg: !isNaN(marks) ? marks - classAvg : 0,
                isBacklog: sub.grade === "F" || sub.grade === "Absent" || sub.grade === "Fail"
            };
        });

        // Trend Data
        const currentSemIdx = getSemesterIndex(selectedStudent.semester);
        const trendData = [];
        for (let i = 0; i <= currentSemIdx; i++) {
            trendData.push({
                name: `Sem ${i + 1}`,
                sgpa: parseFloat(selectedStudent.sgpa[i] || "0")
            });
        }
        const filteredTrendData = trendData.filter(d => d.sgpa > 0);

        return {
            rank,
            percentile,
            zScore,
            currentSgpa,
            currentCgpa,
            subjectDetails,
            trendData,
            cgpaRank,
            zScoreCgpa,
            displayStatus: currentCgpa < 5 ? "FAIL" : (subjectDetails.some(s => s.isBacklog) ? `PROMOTED (${subjectDetails.filter(s => s.isBacklog).map(s => s.code).join(", ")})` : "PASS"),
            statusVariant: (currentCgpa < 5 || subjectDetails.some(s => s.isBacklog)) ? "destructive" : "default" as "default" | "destructive" | "outline" | "secondary"
        };
    }, [selectedStudent, results, meanSgpa, stdDev, subjectAnalysis, meanCgpa, stdDevCgpa, toppers]);


    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Row 1: SGPA Dist & Status */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-2 border-border shadow-pop bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-heading font-extrabold uppercase">SGPA Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sgpaDistribution} margin={{ bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12, fontWeight: 'bold' }} />
                                <YAxis tick={{ fontSize: isMobile ? 10 : 12, fontWeight: 'bold' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: '2px solid #1E293B', boxShadow: '4px 4px 0px #1E293B', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="count" fill="#8B5CF6" name="Students" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-2 border-border shadow-pop bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-heading font-extrabold uppercase">Result Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={!isMobile}
                                    label={isMobile ? undefined : ({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={isMobile ? 65 : 100}
                                    fill="#8B5CF6"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: '2px solid #1E293B', boxShadow: '4px 4px 0px #1E293B', fontWeight: 'bold' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle" 
                                    wrapperStyle={{ fontWeight: 'bold', fontSize: '11px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Extraordinary Bell Curve Row */}
            {stdDev > 0 && (
                <Card className="border-2 border-border shadow-pop relative overflow-hidden bg-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-secondary rounded-full -translate-y-1/2 translate-x-1/2 opacity-10 pointer-events-none blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent rounded-full translate-y-1/2 -translate-x-1/2 opacity-10 pointer-events-none blur-3xl" />
                    <CardHeader className="text-center relative z-10 pb-0">
                        <CardTitle className="text-xl sm:text-3xl font-heading font-extrabold uppercase tracking-wide">
                            Class Performance Curve
                        </CardTitle>
                        <p className="text-muted-foreground font-medium text-xs sm:text-sm">Normal distribution model showing where most students stand</p>
                    </CardHeader>
                    <CardContent className="h-[280px] sm:h-[450px] relative z-10 pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={bellCurveData} margin={{ top: 30, right: 15, left: 15, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F472B6" stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor="#F472B6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                <XAxis 
                                    dataKey="sgpa" 
                                    type="number" 
                                    domain={[0, 10]} 
                                    ticks={isMobile ? [0, 2, 4, 6, 8, 10] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                                    tickLine={false}
                                    axisLine={{ stroke: '#1E293B', strokeWidth: 2 }}
                                    tick={{ fontWeight: 'bold', fontSize: isMobile ? 10 : 12 }}
                                    label={{ value: 'SGPA', position: 'insideBottom', offset: -15, fontWeight: 'bold', fontSize: isMobile ? 10 : 12 }} 
                                />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: '2px solid #1E293B', boxShadow: '4px 4px 0px #1E293B', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#8B5CF6' }}
                                    formatter={(value: any) => [value, 'Probability Density']}
                                />
                                <Area 
                                    type="basis" 
                                    dataKey="probability" 
                                    stroke="#F472B6" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorProb)" 
                                    activeDot={{ r: 8, strokeWidth: 2, stroke: '#1E293B', fill: '#FBBF24' }}
                                />
                                <ReferenceLine 
                                    x={meanSgpa} 
                                    stroke="#8B5CF6" 
                                    strokeWidth={3} 
                                    strokeDasharray="4 4" 
                                    label={{ 
                                        value: isMobile ? `Mean: ${meanSgpa.toFixed(1)}` : `MEAN: ${meanSgpa.toFixed(2)}`, 
                                        position: 'top', 
                                        fill: '#8B5CF6', 
                                        fontWeight: 'bold',
                                        fontSize: isMobile ? 10 : 12
                                    }} 
                                />
                                {/* Standard Deviation Lines */}
                                <ReferenceLine 
                                    x={meanSgpa - stdDev} 
                                    stroke="#34D399" 
                                    strokeWidth={2} 
                                    strokeDasharray="3 3" 
                                    opacity={0.8} 
                                    label={{ 
                                        value: '-1σ', 
                                        position: 'insideBottomLeft', 
                                        fill: '#34D399', 
                                        fontWeight: 'bold',
                                        fontSize: isMobile ? 8 : 11
                                    }} 
                                />
                                <ReferenceLine 
                                    x={meanSgpa + stdDev} 
                                    stroke="#34D399" 
                                    strokeWidth={2} 
                                    strokeDasharray="3 3" 
                                    opacity={0.8} 
                                    label={{ 
                                        value: '+1σ', 
                                        position: 'insideBottomRight', 
                                        fill: '#34D399', 
                                        fontWeight: 'bold',
                                        fontSize: isMobile ? 8 : 11
                                    }} 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Row 2: Killer Subjects & Branch Comparison */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-2 border-border shadow-pop bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-heading font-extrabold uppercase">Top 5 Killer Subjects (Failure Rate)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={killerSubjects} margin={{ left: isMobile ? 5 : 20, right: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis type="number" unit="%" tick={{ fontSize: isMobile ? 10 : 12, fontWeight: 'bold' }} />
                                <YAxis 
                                    dataKey="code" 
                                    type="category" 
                                    width={isMobile ? 50 : 80} 
                                    style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 'bold' }} 
                                />
                                <Tooltip content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white p-3 border-2 border-border shadow-pop-soft rounded-xl text-xs max-w-[250px]">
                                                <p className="font-extrabold text-accent">{data.code}</p>
                                                <p className="font-semibold text-slate-700 leading-tight mt-0.5">{data.name}</p>
                                                <p className="font-heading font-extrabold text-red-500 mt-2 bg-red-50 px-2 py-0.5 border border-red-100 rounded w-fit">
                                                    Fail Rate: {data.failRate.toFixed(1)}%
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }} />
                                <Bar dataKey="failRate" fill="#F472B6" name="Failure Rate %" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-2 border-border shadow-pop bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-heading font-extrabold uppercase">Branch Performance (Mean SGPA)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchComparisonData} margin={{ bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12, fontWeight: 'bold' }} />
                                <YAxis domain={[0, 10]} tick={{ fontSize: isMobile ? 10 : 12, fontWeight: 'bold' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: '2px solid #1E293B', boxShadow: '4px 4px 0px #1E293B', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="sgpa" fill="#8B5CF6" name="Mean SGPA" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Topper Lists */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-2 border-border shadow-pop bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-heading font-extrabold uppercase">Top 5 Students (By SGPA)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isMobile ? (
                            <div className="space-y-3">
                                {toppers.map((student, index) => (
                                    <div key={student.redg_no} className="flex items-center justify-between p-3.5 border-2 border-border rounded-2xl bg-slate-50/50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold border-2 border-border shadow-pop-soft",
                                                index === 0 ? "bg-yellow-400 text-black" :
                                                index === 1 ? "bg-slate-300 text-black" :
                                                index === 2 ? "bg-amber-600 text-white" :
                                                "bg-white text-black"
                                            )}>
                                                {index + 1}
                                            </span>
                                            <div>
                                                <p className="font-bold text-sm leading-tight text-foreground">{student.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{student.redg_no}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-heading font-extrabold text-sm text-green-600 bg-green-50 px-2.5 py-1 border-2 border-green-200 rounded-lg shadow-sm">
                                                {getCurrentSgpa(student).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-bold text-foreground">Rank</TableHead>
                                            <TableHead className="font-bold text-foreground">Reg No</TableHead>
                                            <TableHead className="font-bold text-foreground">Name</TableHead>
                                            <TableHead className="font-bold text-foreground">SGPA</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {toppers.map((student, index) => (
                                            <TableRow key={student.redg_no}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell className="font-mono text-xs">{student.redg_no}</TableCell>
                                                <TableCell className="font-semibold text-slate-700">{student.name}</TableCell>
                                                <TableCell className="font-heading font-extrabold text-green-600">{getCurrentSgpa(student).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-2 border-border shadow-pop bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-heading font-extrabold uppercase">Top 5 Students (By CGPA)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isMobile ? (
                            <div className="space-y-3">
                                {toppersCgpa.map((student, index) => (
                                    <div key={student.redg_no} className="flex items-center justify-between p-3.5 border-2 border-border rounded-2xl bg-slate-50/50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold border-2 border-border shadow-pop-soft",
                                                index === 0 ? "bg-yellow-400 text-black" :
                                                index === 1 ? "bg-slate-300 text-black" :
                                                index === 2 ? "bg-amber-600 text-white" :
                                                "bg-white text-black"
                                            )}>
                                                {index + 1}
                                            </span>
                                            <div>
                                                <p className="font-bold text-sm leading-tight text-foreground">{student.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{student.redg_no}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-heading font-extrabold text-sm text-blue-600 bg-blue-50 px-2.5 py-1 border-2 border-blue-200 rounded-lg shadow-sm">
                                                {(parseFloat(student.cgpa) || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-bold text-foreground">Rank</TableHead>
                                            <TableHead className="font-bold text-foreground">Reg No</TableHead>
                                            <TableHead className="font-bold text-foreground">Name</TableHead>
                                            <TableHead className="font-bold text-foreground">CGPA</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {toppersCgpa.map((student, index) => (
                                            <TableRow key={student.redg_no}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell className="font-mono text-xs">{student.redg_no}</TableCell>
                                                <TableCell className="font-semibold text-slate-700">{student.name}</TableCell>
                                                <TableCell className="font-heading font-extrabold text-blue-600">{(parseFloat(student.cgpa) || 0).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 4: Subject Wise Performance */}
            <div className="space-y-6">
                <h3 className="text-2xl font-heading font-extrabold uppercase tracking-wide">Subject Wise Performance</h3>

                {/* Comparison Chart */}
                <Card className="border-2 border-border shadow-pop bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl font-heading font-extrabold uppercase">Subject Comparison (Average Marks)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectComparisonData} margin={{ bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12, fontWeight: 'bold' }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: isMobile ? 10 : 12, fontWeight: 'bold' }} />
                                <Tooltip content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white p-3 border-2 border-border shadow-pop-soft rounded-xl text-xs max-w-[250px]">
                                                <p className="font-extrabold text-accent">{label}</p>
                                                <p className="font-semibold text-slate-700 leading-tight mt-0.5">{data.fullName}</p>
                                                <p className="font-bold text-slate-900 mt-2">Class Average: {data.avg.toFixed(1)} / 100</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }} />
                                <Bar dataKey="avg" fill="#8B5CF6" name="Avg Marks" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Detailed Analysis */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="text-lg sm:text-xl font-heading font-extrabold uppercase text-slate-800">Detailed Subject Analysis</h4>
                        <Select
                            value={selectedSubjectCode}
                            onValueChange={setSelectedSubjectCode}
                        >
                            <SelectTrigger className="w-full sm:w-[320px] border-2 border-border font-bold bg-white">
                                <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                            <SelectContent className="border-2 border-border">
                                {subjectAnalysis.map((sub) => (
                                    <SelectItem key={sub.code} value={sub.code} className="font-semibold">
                                        {sub.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedSubject ? (
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="border-2 border-border shadow-pop bg-white">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg font-heading font-extrabold text-foreground leading-tight">{selectedSubject.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground font-mono">{selectedSubject.code}</p>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-secondary/15 p-4 border-2 border-secondary/20 rounded-2xl text-center">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Average Marks</p>
                                            <p className="text-3xl font-heading font-extrabold text-secondary mt-1">{selectedSubject.avg.toFixed(1)}</p>
                                        </div>
                                        <div className="bg-quaternary/15 p-4 border-2 border-quaternary/20 rounded-2xl text-center">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Pass Rate</p>
                                            <p className={cn(
                                                "text-3xl font-heading font-extrabold mt-1",
                                                selectedSubject.passRate < 50 ? "text-red-500" : "text-quaternary"
                                            )}>
                                                {selectedSubject.passRate.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Grade Distribution</h4>
                                        <div className="h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={selectedSubject.gradeDist} margin={{ bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                    <XAxis dataKey="name" tick={{ fontSize: isMobile ? 9 : 11, fontWeight: 'bold' }} />
                                                    <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 9 : 11, fontWeight: 'bold' }} />
                                                    <Tooltip 
                                                        contentStyle={{ borderRadius: '12px', border: '2px solid #1E293B', boxShadow: '4px 4px 0px #1E293B', fontWeight: 'bold' }}
                                                    />
                                                    <Bar dataKey="value" fill="#34D399" name="Students" radius={[3, 3, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-border shadow-pop bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg font-heading font-extrabold uppercase">Top Performers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isMobile ? (
                                        <div className="space-y-2">
                                            {selectedSubject.topPerformers.map((student, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-xl bg-slate-50/50">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold border-2 border-border shadow-pop-soft",
                                                            idx === 0 ? "bg-yellow-400 text-black" :
                                                            idx === 1 ? "bg-slate-300 text-black" :
                                                            idx === 2 ? "bg-amber-600 text-white" :
                                                            "bg-white text-black"
                                                        )}>
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-sm font-bold text-foreground">{student.name}</span>
                                                    </div>
                                                    <span className="font-heading font-extrabold text-sm text-accent bg-accent/5 border border-accent/20 px-2 py-0.5 rounded">
                                                        {student.marks}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50px] font-bold text-foreground">Rank</TableHead>
                                                        <TableHead className="font-bold text-foreground">Name</TableHead>
                                                        <TableHead className="text-right font-bold text-foreground">Marks</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedSubject.topPerformers.map((student, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">
                                                                <span className={cn(
                                                                    "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border-2 border-border shadow-pop-soft",
                                                                    idx === 0 ? "bg-yellow-400 text-black" :
                                                                    idx === 1 ? "bg-slate-300 text-black" :
                                                                    idx === 2 ? "bg-amber-600 text-white" :
                                                                    "bg-white text-black"
                                                                )}>
                                                                    {idx + 1}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="font-semibold text-slate-700">{student.name}</TableCell>
                                                            <TableCell className="text-right font-bold text-accent">{student.marks}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-slate-50/50">
                            Select a subject to view detailed analysis
                        </div>
                    )}
                </div>
            </div>

            {/* Row 5: Individual Student Analytics */}
            <div className="pt-8 border-t-2 border-border">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div>
                        <h3 className="text-2xl sm:text-3xl font-heading font-extrabold uppercase text-slate-900">Individual Student Analytics</h3>
                        <p className="text-muted-foreground text-sm font-medium">Detailed performance report and academic history</p>
                    </div>
                    <Select
                        value={selectedStudentReg}
                        onValueChange={setSelectedStudentReg}
                    >
                        <SelectTrigger className="w-full sm:w-[320px] border-2 border-border font-bold bg-white">
                            <SelectValue placeholder="Select Student by Reg No" />
                        </SelectTrigger>
                        <SelectContent className="border-2 border-border">
                            {sortedStudents.map((student) => (
                                <SelectItem key={student.redg_no} value={student.redg_no.toString()} className="font-semibold">
                                    {student.redg_no} - {student.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedStudent && studentMetrics ? (
                    <div className="space-y-6">
                        {/* Snapshot Cards */}
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                            <Card className="border-2 border-border shadow-pop bg-white">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Semester SGPA & CGPA</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-3xl font-heading font-extrabold text-foreground">{studentMetrics.currentSgpa.toFixed(2)}</div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">SGPA</p>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-heading font-extrabold text-blue-600">{studentMetrics.currentCgpa.toFixed(2)}</div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">CGPA</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-border shadow-pop bg-white">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Class Rank</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-3xl font-heading font-extrabold text-foreground">#{studentMetrics.rank}</div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">SGPA Rank</p>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-heading font-extrabold text-blue-600">#{studentMetrics.cgpaRank}</div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">CGPA Rank</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-border shadow-pop bg-white">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Academic Z-Score</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className={cn(
                                                "text-3xl font-heading font-extrabold",
                                                studentMetrics.zScore >= 0 ? "text-green-600" : "text-red-500"
                                            )}>
                                                {studentMetrics.zScore > 0 ? "+" : ""}{studentMetrics.zScore.toFixed(2)}σ
                                            </div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">SGPA Z</p>
                                        </div>
                                        <div>
                                            <div className={cn(
                                                "text-3xl font-heading font-extrabold",
                                                studentMetrics.zScoreCgpa >= 0 ? "text-blue-600" : "text-red-500"
                                            )}>
                                                {studentMetrics.zScoreCgpa > 0 ? "+" : ""}{studentMetrics.zScoreCgpa.toFixed(2)}σ
                                            </div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">CGPA Z</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-border shadow-pop bg-white flex flex-col justify-between">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Result Status</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex items-center pt-1">
                                    <Badge 
                                        variant={studentMetrics.statusVariant} 
                                        className="text-base font-extrabold py-1.5 px-4 border-2 border-border shadow-pop-soft"
                                    >
                                        {studentMetrics.displayStatus}
                                    </Badge>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {/* Subject Comparison Table / Mobile Cards */}
                            <Card className="md:col-span-2 border-2 border-border shadow-pop bg-white">
                                <CardHeader>
                                    <CardTitle className="text-xl sm:text-2xl font-heading font-extrabold uppercase">Subject Performance Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isMobile ? (
                                        <div className="space-y-4">
                                            {studentMetrics.subjectDetails.map((sub, idx) => (
                                                <div key={idx} className={cn(
                                                    "p-4 border-2 rounded-2xl shadow-sm space-y-3 bg-white",
                                                    sub.isBacklog ? "border-red-300 bg-red-50/20" : "border-border/60"
                                                )}>
                                                    <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2">
                                                        <div>
                                                            <p className="font-extrabold text-sm leading-tight text-slate-800">{sub.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{sub.code}</p>
                                                        </div>
                                                        <Badge variant={sub.isBacklog ? "destructive" : "outline"} className="shrink-0 font-bold border-2">
                                                            {sub.grade}
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="bg-slate-50 p-2 border border-slate-100 rounded-xl">
                                                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Marks Obtained</p>
                                                            <p className="text-sm font-extrabold text-slate-800 mt-0.5">{sub.total}</p>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 border border-slate-100 rounded-xl">
                                                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Class Average</p>
                                                            <p className="text-sm font-extrabold text-slate-800 mt-0.5">{sub.classAvg.toFixed(1)}</p>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 border border-slate-100 rounded-xl">
                                                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Class Best</p>
                                                            <p className="text-sm font-extrabold text-slate-800 mt-0.5">{sub.bestScore}</p>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 border border-slate-100 rounded-xl">
                                                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Sem Topper</p>
                                                            <p className="text-sm font-extrabold text-slate-800 mt-0.5">{sub.semTopperScore}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100/50">
                                                        <span className="text-muted-foreground font-bold">Relative Performance:</span>
                                                        {sub.diffFromAvg >= 0 ? (
                                                            <span className="text-green-600 font-extrabold bg-green-50 px-2 py-0.5 border border-green-200 rounded-lg text-[10px]">
                                                                +{sub.diffFromAvg.toFixed(1)} (Above Avg)
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-500 font-extrabold bg-red-50 px-2 py-0.5 border border-red-200 rounded-lg text-[10px]">
                                                                {sub.diffFromAvg.toFixed(1)} (Below Avg)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="font-bold text-foreground">Subject</TableHead>
                                                        <TableHead className="font-bold text-foreground">Marks</TableHead>
                                                        <TableHead className="font-bold text-foreground">Grade</TableHead>
                                                        <TableHead className="font-bold text-foreground">Best Score</TableHead>
                                                        <TableHead className="font-bold text-foreground">Sem Topper Score</TableHead>
                                                        <TableHead className="font-bold text-foreground">Class Avg</TableHead>
                                                        <TableHead className="font-bold text-foreground">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {studentMetrics.subjectDetails.map((sub, idx) => (
                                                        <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <TableCell className="font-semibold text-slate-800">{sub.name}</TableCell>
                                                            <TableCell className="font-mono">{sub.total}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={sub.isBacklog ? "destructive" : "outline"} className="font-bold">
                                                                    {sub.grade}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="font-mono">{sub.bestScore}</TableCell>
                                                            <TableCell className="font-mono">{sub.semTopperScore}</TableCell>
                                                            <TableCell className="font-mono">{sub.classAvg.toFixed(1)}</TableCell>
                                                            <TableCell>
                                                                {sub.diffFromAvg >= 0 ? (
                                                                    <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 border border-green-150 rounded">+{sub.diffFromAvg.toFixed(1)} (Above Avg)</span>
                                                                ) : (
                                                                    <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-0.5 border border-red-150 rounded">{sub.diffFromAvg.toFixed(1)} (Below Avg)</span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Academic Trend & Summary Verdict */}
                            <div className="space-y-6">
                                <Card className="border-2 border-border shadow-pop bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-heading font-extrabold uppercase">SGPA Trend</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[220px] pr-2 pl-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={studentMetrics.trendData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '12px', border: '2px solid #1E293B', boxShadow: '4px 4px 0px #1E293B', fontWeight: 'bold', fontSize: '11px' }}
                                                />
                                                <Line type="monotone" dataKey="sgpa" stroke="#8B5CF6" strokeWidth={4} activeDot={{ r: 6, strokeWidth: 2, stroke: '#1E293B' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-2 border-border shadow-pop bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-heading font-extrabold uppercase">Summary Verdict</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                <strong className="text-foreground uppercase tracking-wider text-xs block mb-1">Academic Standing:</strong>
                                                {studentMetrics.zScore > 1 ? "🌟 Excellent. Consistently performing well above average and displaying stellar academic competence." :
                                                    studentMetrics.zScore > 0 ? "📈 Good. Solid performance, staying comfortably ahead of the class average." :
                                                        studentMetrics.zScore > -1 ? "⚖️ Average. Academic standing is consistent with the class mean." :
                                                            "⚠️ Needs Improvement. Performance is below the class average; extra attention is recommended."}
                                            </p>
                                            {studentMetrics.subjectDetails.some(s => s.isBacklog) && (
                                                <div className="mt-4 p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl">
                                                    <p className="text-red-800 font-extrabold text-xs uppercase tracking-wider mb-2">⚠️ Attention Required:</p>
                                                    <ul className="space-y-1 text-xs text-red-700 font-semibold list-inside">
                                                        {studentMetrics.subjectDetails.filter(s => s.isBacklog).map(s => (
                                                            <li key={s.code} className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                                                                {s.name} ({s.grade})
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                        <StudentAIChat 
                          studentData={selectedStudent} 
                          metrics={studentMetrics}
                          classStats={{
                            totalStudents: results.length,
                            meanSgpa,
                            meanCgpa,
                            stdDev,
                            stdDevCgpa,
                            topperName: toppers[0]?.name,
                            topperSgpa: toppers[0] ? getCurrentSgpa(toppers[0]) : 0,
                            branchName,
                          }}
                        />
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-slate-50/50">
                        <p className="text-muted-foreground font-semibold">Select a student from the dropdown above to view their individual analytics report.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
