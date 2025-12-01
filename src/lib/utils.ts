import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const BRANCH_DATA = [
    { code: "101", name: "Civil Engineering", count: 65 },
    { code: "102", name: "Mechanical Engineering", count: 65 },
    { code: "103", name: "Electrical Engineering", count: 65 },
    { code: "104", name: "Electronics & Communication Engineering", count: 50 },
    { code: "106", name: "Information Technology", count: 65 },
    { code: "107", name: "Chemical Engineering", count: 40 },
    { code: "117", name: "Biomedical & Robotic Engineering", count: 60 },
];

export const COLLEGE_CODE = "107"; // MIT Muzaffarpur
export const BATCH_YEAR = "23";

export function generateRegistrationNumbers(
    branchCode: string,
    count: number
): string[] {
    const regNos: string[] = [];

    // Regular students
    for (let i = 1; i <= count; i++) {
        const serial = i.toString().padStart(3, "0");
        // Format: YYBBCCCSSS -> 23 + Branch + 107 + Serial
        const regNo = `${BATCH_YEAR}${branchCode}${COLLEGE_CODE}${serial}`;
        regNos.push(regNo);
    }

    // Lateral Entry students (901 - 920)
    // Lateral entry joins in 2nd year, so their batch is Year + 1 (e.g., 23 -> 24)
    const lateralYear = (parseInt(BATCH_YEAR) + 1).toString();
    for (let i = 901; i <= 920; i++) {
        const serial = i.toString();
        const regNo = `${lateralYear}${branchCode}${COLLEGE_CODE}${serial}`;
        regNos.push(regNo);
    }

    return regNos;
}
