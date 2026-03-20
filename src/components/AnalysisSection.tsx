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
} from "recharts";
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
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { getCurrentSgpa, getEffectiveCgpa, getSemesterIndex } from "@/lib/utils";

interface AnalysisSectionProps {
    results: StudentResult[];
    branchName: string;
}

const COLORS = ["#22c55e", "#eab308", "#ef4444"]; // Green, Yellow, Red

export function AnalysisSection({ results, branchName }: AnalysisSectionProps) {
    const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("all");
    const [selectedStudentReg, setSelectedStudentReg] = useState<string>("");

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
    const subjectStats: Record<string, { name: string; total: number; failed: number }> = {};

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
                subjectStats[sub.code] = { name: sub.name, total: 0, failed: 0 };
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
            code: s.name,
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
                <Card>
                    <CardHeader>
                        <CardTitle>SGPA Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sgpaDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8884d8" name="Students" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Result Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Killer Subjects & Branch Comparison */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Killer Subjects (Failure Rate)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={killerSubjects} margin={{ left: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" unit="%" />
                                <YAxis dataKey="name" type="category" width={150} style={{ fontSize: '10px' }} />
                                <Tooltip />
                                <Bar dataKey="failRate" fill="#ef4444" name="Failure Rate %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Branch Performance (Mean SGPA)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 10]} />
                                <Tooltip />
                                <Bar dataKey="sgpa" fill="#3b82f6" name="Mean SGPA" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Topper Lists */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Students (By SGPA)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Reg No</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>SGPA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {toppers.map((student, index) => (
                                    <TableRow key={student.redg_no}>
                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                        <TableCell>{student.redg_no}</TableCell>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell className="font-bold text-green-600">{getCurrentSgpa(student).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Students (By CGPA)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Reg No</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>CGPA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {toppersCgpa.map((student, index) => (
                                    <TableRow key={student.redg_no}>
                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                        <TableCell>{student.redg_no}</TableCell>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell className="font-bold text-blue-600">{student.cgpa}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Row 4: Subject Wise Performance */}
            <div>
                <h3 className="text-xl font-bold mb-4">Subject Wise Performance</h3>

                {/* Comparison Chart */}
                <div className="mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subject Comparison (Average Marks)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjectComparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-2 border rounded shadow-sm text-sm">
                                                    <p className="font-bold">{data.fullName}</p>
                                                    <p>Code: {label}</p>
                                                    <p>Avg: {data.avg}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Bar dataKey="avg" fill="#8b5cf6" name="Avg Marks" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Analysis */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold">Detailed Subject Analysis</h3>
                        <Select
                            value={selectedSubjectCode}
                            onValueChange={setSelectedSubjectCode}
                        >
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {subjectAnalysis.map((sub) => (
                                    <SelectItem key={sub.code} value={sub.code}>
                                        {sub.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedSubject ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{selectedSubject.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground">{selectedSubject.code}</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-secondary/20 p-4 rounded-lg text-center">
                                            <p className="text-sm text-muted-foreground">Average Marks</p>
                                            <p className="text-2xl font-bold">{selectedSubject.avg.toFixed(1)}</p>
                                        </div>
                                        <div className="bg-secondary/20 p-4 rounded-lg text-center">
                                            <p className="text-sm text-muted-foreground">Pass Percentage</p>
                                            <p className={`text-2xl font-bold ${selectedSubject.passRate < 50 ? "text-red-500" : "text-green-600"}`}>
                                                {selectedSubject.passRate.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold mb-3">Grade Distribution</h4>
                                        <div className="h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={selectedSubject.gradeDist}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" fill="#10b981" name="Students" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Top Performers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">Rank</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead className="text-right">Marks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedSubject.topPerformers.map((student, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">
                                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${idx === 0 ? "bg-yellow-100 text-yellow-700" :
                                                            idx === 1 ? "bg-gray-100 text-gray-700" :
                                                                idx === 2 ? "bg-orange-50 text-orange-700" :
                                                                    "bg-slate-100 text-slate-700"
                                                            }`}>
                                                            {idx + 1}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{student.name}</TableCell>
                                                    <TableCell className="text-right font-bold">{student.marks}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            Select a subject to view detailed analysis
                        </div>
                    )}
                </div>
            </div>

            {/* Row 5: Individual Student Analytics */}
            <div className="pt-8 border-t">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-bold">Individual Student Analytics</h3>
                        <p className="text-muted-foreground">Detailed performance report and academic history</p>
                    </div>
                    <Select
                        value={selectedStudentReg}
                        onValueChange={setSelectedStudentReg}
                    >
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Select Student by Reg No" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedStudents.map((student) => (
                                <SelectItem key={student.redg_no} value={student.redg_no.toString()}>
                                    {student.redg_no} - {student.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedStudent && studentMetrics ? (
                    <div className="space-y-6">
                        {/* Snapshot Cards */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Current SGPA</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-2xl font-bold">{studentMetrics.currentSgpa.toFixed(2)}</div>
                                            <p className="text-xs text-muted-foreground">Current SGPA</p>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-blue-600">{studentMetrics.currentCgpa.toFixed(2)}</div>
                                            <p className="text-xs text-muted-foreground">CGPA</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Class Rank</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-2xl font-bold">#{studentMetrics.rank}</div>
                                            <p className="text-xs text-muted-foreground">SGPA Rank</p>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">#{studentMetrics.cgpaRank}</div>
                                            <p className="text-xs text-muted-foreground">CGPA Rank</p>
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Z-Score</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className={`text-2xl font-bold ${studentMetrics.zScore >= 0 ? "text-green-600" : "text-red-500"}`}>
                                                {studentMetrics.zScore > 0 ? "+" : ""}{studentMetrics.zScore.toFixed(2)}σ
                                            </div>
                                            <p className="text-xs text-muted-foreground">SGPA Z-Score</p>
                                        </div>
                                        <div>
                                            <div className={`text-2xl font-bold ${studentMetrics.zScoreCgpa >= 0 ? "text-blue-600" : "text-red-500"}`}>
                                                {studentMetrics.zScoreCgpa > 0 ? "+" : ""}{studentMetrics.zScoreCgpa.toFixed(2)}σ
                                            </div>
                                            <p className="text-xs text-muted-foreground">CGPA Z-Score</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Result Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Badge variant={studentMetrics.statusVariant} className="text-lg">
                                        {studentMetrics.displayStatus}
                                    </Badge>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {/* Subject Comparison Table */}
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Subject Performance Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Marks</TableHead>
                                                <TableHead>Grade</TableHead>
                                                <TableHead>Best Score</TableHead>
                                                <TableHead>Sem Topper Score</TableHead>
                                                <TableHead>Class Avg</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {studentMetrics.subjectDetails.map((sub, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{sub.name}</TableCell>
                                                    <TableCell>{sub.total}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={sub.isBacklog ? "destructive" : "outline"}>
                                                            {sub.grade}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{sub.bestScore}</TableCell>
                                                    <TableCell>{sub.semTopperScore}</TableCell>
                                                    <TableCell>{sub.classAvg.toFixed(1)}</TableCell>
                                                    <TableCell>
                                                        {sub.diffFromAvg >= 0 ? (
                                                            <span className="text-green-600 text-xs font-bold">+{sub.diffFromAvg.toFixed(1)} (Above Avg)</span>
                                                        ) : (
                                                            <span className="text-red-500 text-xs font-bold">{sub.diffFromAvg.toFixed(1)} (Below Avg)</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Academic Trend */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>SGPA Trend</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={studentMetrics.trendData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis domain={[0, 10]} />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="sgpa" stroke="#8884d8" strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Summary Verdict</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <p className="text-sm">
                                                <span className="font-bold">Performance: </span>
                                                {studentMetrics.zScore > 1 ? "Excellent. Consistently performing well above average." :
                                                    studentMetrics.zScore > 0 ? "Good. Performing above class average." :
                                                        studentMetrics.zScore > -1 ? "Average. Performance is consistent with the class mean." :
                                                            "Needs Improvement. Performance is below class average."}
                                            </p>
                                            {studentMetrics.subjectDetails.some(s => s.isBacklog) && (
                                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                                    <p className="text-red-800 font-bold text-sm mb-1">Attention Required:</p>
                                                    <ul className="list-disc list-inside text-xs text-red-700">
                                                        {studentMetrics.subjectDetails.filter(s => s.isBacklog).map(s => (
                                                            <li key={s.code}>{s.name} ({s.grade})</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Select a student from the dropdown above to view their individual analytics report.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
