"use server";

import { ApiResponse, StudentResult } from "@/types";

export async function fetchStudentResult(
    regNo: string,
    year: string,
    semester: string | string[],
    examHeld: string
): Promise<StudentResult | null> {
    const semestersToTry = Array.isArray(semester) ? semester : [semester];

    for (const sem of semestersToTry) {
        const url = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${year}&redg_no=${regNo}&semester=${sem}&exam_held=${encodeURIComponent(examHeld)}`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Referer": "https://beu-bih.ac.in/",
                },
                next: { revalidate: 86400 }, // Globally cache successful API responses for 24 hours
            });

            if (!response.ok) {
                console.error(`Failed to fetch result for ${regNo} with sem ${sem}: ${response.status} ${response.statusText}`);
                continue; // Try next fallback if status is abnormal
            }

            const data: ApiResponse = await response.json();

            if (data.status === 200 && data.data) {
                return data.data; // Success! Return immediately.
            } else {
                console.warn(`API returned non-200 status or no data for ${regNo} with sem ${sem}:`, data.message);
                // Keep trying next semester fallback
            }
        } catch (error) {
            console.error(`Error fetching result for ${regNo} with sem ${sem}:`, error);
            // Keep trying next fallback
        }
    }

    // If all fallbacks failed, return null
    return null;
}

export async function fetchClassResults(
    regNos: string[],
    year: string,
    semester: string | string[],
    examHeld: string
): Promise<StudentResult[]> {
    const results: StudentResult[] = [];
    const BATCH_SIZE = 15; // Safely process rapidly on Vercel without triggering CPU limits or massive rate limits.

    for (let i = 0; i < regNos.length; i += BATCH_SIZE) {
        const batch = regNos.slice(i, i + BATCH_SIZE);
        const promises = batch.map((regNo) =>
            fetchStudentResult(regNo, year, semester, examHeld)
        );

        const batchResults = await Promise.all(promises);

        batchResults.forEach((res) => {
            if (res) {
                results.push(res);
            }
        });
    }

    return results;
}
