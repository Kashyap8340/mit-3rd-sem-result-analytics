import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const BRANCH_DATA = [
    { code: "101", name: "Civil Engineering", count: 65, batchIds: ["23", "23-4", "24"] },
    { code: "102", name: "Mechanical Engineering", count: 65, batchIds: ["23", "23-4", "24"] },
    { code: "103", name: "Electrical Engineering", count: 65, batchIds: ["23", "23-4", "24"] },
    { code: "104", name: "Electronics & Communication Engineering", count: 50, batchIds: ["23", "23-4", "24"] },
    { code: "105", name: "Computer Science (CSE)", count: 60, batchIds: ["24"] },
    { code: "106", name: "Information Technology", count: 65, batchIds: ["23", "23-4", "24"] },
    { code: "107", name: "Chemical Engineering", count: 40, batchIds: ["23", "23-4"] },
    { code: "117", name: "Biomedical & Robotic Engineering", count: 60, batchIds: ["23", "23-4", "24"] },
    { code: "165", name: "Chemical Technology (CT)", count: 50, batchIds: ["24"] },
];

export const COLLEGE_CODE = "107"; // MIT Muzaffarpur

export interface BatchConfig {
    id: string; // Internal ID
    label: string; // UI Label
    apiYear: string;
    apiSemester: string | string[];
    apiExamHeld: string;
    regPrefix: string; // Prefix for regular students e.g. "23", "24"
    lateralPrefix: string; // Prefix for lateral entry e.g. "24", "25"
}

export const BATCH_CONFIGS: BatchConfig[] = [
    {
        id: "24",
        label: "2024 Batch (2nd Semester)",
        apiYear: "2025",
        apiSemester: ["2", "II"], // Some branches use "2" while others use "II"
        apiExamHeld: "November/2025",
        regPrefix: "24",
        lateralPrefix: "25",
    },
    {
        id: "23",
        label: "2023 Batch (3rd Semester)",
        apiYear: "2024",
        apiSemester: "III", // Note: 3rd sem API expects Roman numeral, 2nd sem API expects number "2". Found during test.
        apiExamHeld: "July/2025",
        regPrefix: "23",
        lateralPrefix: "24",
    },
    {
        id: "23-4",
        label: "2023 Batch (4th Semester)",
        apiYear: "2025",
        apiSemester: "IV",
        apiExamHeld: "December/2025",
        regPrefix: "23",
        lateralPrefix: "24",
    }
];

export function generateRegistrationNumbers(
    branchCode: string,
    count: number,
    batchId: string
): string[] {
    const regNos: string[] = [];
    const batchConfig = BATCH_CONFIGS.find(b => b.id === batchId);
    if (!batchConfig) return [];

    // Regular students
    for (let i = 1; i <= count; i++) {
        const serial = i.toString().padStart(3, "0");
        const regNo = `${batchConfig.regPrefix}${branchCode}${COLLEGE_CODE}${serial}`;
        regNos.push(regNo);
    }

    // Lateral Entry students (901 - 920)
    for (let i = 901; i <= 920; i++) {
        const serial = i.toString();
        const regNo = `${batchConfig.lateralPrefix}${branchCode}${COLLEGE_CODE}${serial}`;
        regNos.push(regNo);
    }

    return regNos;
}

import { StudentResult } from "@/types";

export function getSemesterIndex(semesterField: string): number {
    const semMap: Record<string, number> = {
        "1": 0, "I": 0,
        "2": 1, "II": 1,
        "3": 2, "III": 2,
        "4": 3, "IV": 3,
        "5": 4, "V": 4,
        "6": 5, "VI": 5,
        "7": 6, "VII": 6,
        "8": 7, "VIII": 7,
    };
    return semMap[semesterField?.toString().toUpperCase()] ?? -1;
}

export function getCurrentSgpa(student: StudentResult): number {
    const idx = getSemesterIndex(student.semester);
    if (idx >= 0 && student.sgpa[idx] && student.sgpa[idx] !== "-") {
        const val = parseFloat(student.sgpa[idx] as string);
        if (!isNaN(val)) return val;
    }
    // Fallback: get last valid SGPA recorded
    const validSgpas = student.sgpa.filter(val => val && val !== "-");
    if (validSgpas.length === 0) return 0;
    return parseFloat(validSgpas[validSgpas.length - 1] || "0");
}

export function getEffectiveCgpa(student: StudentResult): number {
    const rawCgpa = parseFloat(student.cgpa);
    if (!isNaN(rawCgpa) && rawCgpa > 0) return rawCgpa;
    return getCurrentSgpa(student); // Fallback to current SGPA
}
