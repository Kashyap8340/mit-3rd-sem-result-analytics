"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StudentResult } from "@/types";
import { Download, ExternalLink } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn, getCurrentSgpa, getEffectiveCgpa, getSemesterIndex } from "@/lib/utils";

interface ResultTableProps {
    results: StudentResult[];
    branchName: string;
    examId?: string;
}

export function ResultTable({ results, branchName, examId }: ResultTableProps) {
    // Helper to get failed papers

    // Helper to get failed papers
    const getFailedPapers = (student: StudentResult) => {
        const allSubjects = [
            ...(student.theorySubjects || []),
            ...(student.practicalSubjects || [])
        ];
        return allSubjects
            .filter(s => s.grade === 'F' || s.grade === 'Absent' || s.grade === 'Fail')
            .map(s => s.code);
    };

    // Sort by CGPA descending
    const sortedResults = [...results].sort((a, b) => {
        return getEffectiveCgpa(b) - getEffectiveCgpa(a);
    });

    const generateOfficialLink = (student: StudentResult, examIdVal: string) => {
        try {
            const romanToOrdinal: Record<string, string> = { 
                "I": "1st", "II": "2nd", "III": "3rd", "IV": "4th", 
                "V": "5th", "VI": "6th", "VII": "7th", "VIII": "8th",
                "1": "1st", "2": "2nd", "3": "3rd", "4": "4th",
                "5": "5th", "6": "6th", "7": "7th", "8": "8th"
            };
            const semClean = student.semester.replace(" Semester", "").trim();
            const semOrdinal = romanToOrdinal[semClean] || semClean;
            const examName = `B.Tech. ${semOrdinal} Semester Examination, ${student.examYear}`;
            
            const semIndex = getSemesterIndex(student.semester);
            const numericSemId = semIndex >= 0 ? semIndex + 1 : 4;

            const backDObj = {
                semester: numericSemId,
                session: student.examYear.toString(),
                exam_held: student.exam_held,
                exam_id: examIdVal || ""
            };
            const backDBase64 = btoa(JSON.stringify(backDObj));

            const dObj = {
                name: examName,
                semester: semClean,
                session: student.examYear.toString(),
                regNo: student.redg_no.toString(),
                exam_held: student.exam_held,
                backD: backDBase64,
                backName: examName
            };

            const dBase64 = btoa(JSON.stringify(dObj));
            return `https://beu-bih.ac.in/result-three?d=${encodeURIComponent(dBase64)}`;
        } catch (e) {
            console.error("Error generating official link:", e);
            return "#";
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        const collegeName = results[0]?.college_name || "MIT Muzaffarpur";

        doc.setFontSize(14);
        doc.text(collegeName, 14, 22);
        doc.setFontSize(12);
        doc.text(`Result Summary - ${branchName}`, 14, 30);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);

        const tableData = sortedResults.map((student, index) => {
            const effectiveCgpa = getEffectiveCgpa(student).toFixed(2);
            const failedPapers = getFailedPapers(student);

            let status = student.fail_any;
            const cgpaVal = parseFloat(effectiveCgpa);
            if (status !== "PASS") {
                if (cgpaVal < 5) status = "FAIL";
                else status = "PROMOTED";
            }

            // Append failed papers to status for PDF
            let statusText = status;
            if (failedPapers.length > 0) {
                statusText += ` (${failedPapers.join(", ")})`;
            }

            return [
                index + 1,
                student.redg_no,
                student.name,
                getCurrentSgpa(student).toFixed(2) || "N/A", // Current SGPA
                effectiveCgpa,
                statusText,
            ];
        });

        autoTable(doc, {
            head: [["Serial No", "Reg No", "Name", "Current SGPA", "CGPA", "Status"]],
            body: tableData,
            startY: 40,
            theme: "grid",
            styles: { fontSize: 8 },
            headStyles: { fillColor: [22, 163, 74] }, // Green header
        });

        const prefix = collegeName.toLowerCase().includes("mit") ? "MIT" : "BEU";
        doc.save(`${prefix}_Result_${branchName.replace(/\s+/g, "_")}.pdf`);
    };

    if (results.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">No results fetched yet.</div>;
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex justify-end">
                <Button onClick={exportPDF} variant="outline" className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Download className="h-4 w-4" />
                    Export PDF
                </Button>
            </div>
            <div className="rounded-2xl border-2 border-border bg-white shadow-pop overflow-hidden">
                <div className="max-h-[600px] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                            <TableRow>
                                <TableHead className="w-[80px]">Serial</TableHead>
                                <TableHead>Reg No</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Current SGPA</TableHead>
                                <TableHead>CGPA</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedResults.map((student, index) => {
                                const effectiveCgpa = getEffectiveCgpa(student).toFixed(2);
                                const failedPapers = getFailedPapers(student);

                                return (
                                    <TableRow key={student.redg_no} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                        <TableCell className="font-mono text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <span>{student.redg_no}</span>
                                                {examId && (
                                                    <a 
                                                        href={generateOfficialLink(student, examId)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        title="Verify on Official BEU Site"
                                                        className="text-accent hover:text-accent/80 transition-colors cursor-pointer inline-flex items-center"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5 animate-pulse-slow" strokeWidth={2.5} />
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell>{getCurrentSgpa(student).toFixed(2) || "N/A"}</TableCell>
                                        <TableCell className="font-bold">{effectiveCgpa}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col items-start gap-1">
                                                {(() => {
                                                    const cgpaVal = parseFloat(effectiveCgpa);
                                                    let status = student.fail_any;
                                                    let badgeClass = "bg-yellow-50 text-yellow-700 border-yellow-200"; // Default Promoted/Backlog

                                                    if (status === "PASS") {
                                                        badgeClass = "bg-green-50 text-green-700 border-green-200";
                                                    } else if (cgpaVal < 5) {
                                                        status = "FAIL";
                                                        badgeClass = "bg-red-50 text-red-700 border-red-200";
                                                    } else {
                                                        status = "PROMOTED"; // Paper Back
                                                    }

                                                    return (
                                                        <span
                                                            className={cn(
                                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                                                badgeClass
                                                            )}
                                                        >
                                                            {status}
                                                        </span>
                                                    );
                                                })()}

                                                {failedPapers.length > 0 && (
                                                    <div className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                                                        Back: {failedPapers.join(", ")}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
