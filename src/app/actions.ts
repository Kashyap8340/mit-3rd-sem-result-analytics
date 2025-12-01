"use server";

import { ApiResponse, StudentResult } from "@/types";

export async function fetchStudentResult(regNo: string): Promise<StudentResult | null> {
    const url = `https://beu-bih.ac.in/backend/v1/result/get-result?year=2024&redg_no=${regNo}&semester=III&exam_held=July/2025`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://beu-bih.ac.in/",
            },
            cache: "no-store", // Ensure fresh data
        });

        if (!response.ok) {
            console.error(`Failed to fetch result for ${regNo}: ${response.status} ${response.statusText}`);
            return null;
        }

        const data: ApiResponse = await response.json();

        if (data.status === 200 && data.data) {
            return data.data;
        } else {
            console.warn(`API returned non-200 status or no data for ${regNo}:`, data);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching result for ${regNo}:`, error);
        return null;
    }
}
