"use server";

import { ApiResponse, StudentResult } from "@/types";

// In-memory cache for fetched results to preserve server load and avoid token consumption
// Key format: `${regNo}-${sem}-${year}`
const resultsCache = new Map<string, { data: StudentResult; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchStudentResult(
    regNo: string,
    year: string,
    semester: string | string[],
    examHeld: string
): Promise<StudentResult | null> {
    const semestersToTry = Array.isArray(semester) ? semester : [semester];

    for (const sem of semestersToTry) {
        // 1. Check local cache first
        const cacheKey = `${regNo}-${sem}-${year}`;
        const cachedEntry = resultsCache.get(cacheKey);
        if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
            return cachedEntry.data;
        }

        try {
            // 2. Fetch a fresh single-use token from the BEU backend
            const tokenResponse = await fetch("https://beu-bih.ac.in/backend/v1/result/token", {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Referer": "https://beu-bih.ac.in/",
                },
                cache: "no-store", // Always fetch a new token, never cache this
            });

            if (!tokenResponse.ok) {
                console.error(`Failed to fetch result token for ${regNo}: ${tokenResponse.status} ${tokenResponse.statusText}`);
                continue;
            }

            const tokenData = await tokenResponse.json();
            const token = tokenData?.token;
            if (!token) {
                console.error(`No token returned in token response for ${regNo}`);
                continue;
            }

            // 3. Request the result using the token
            const url = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${year}&redg_no=${regNo}&semester=${sem}&exam_held=${encodeURIComponent(examHeld)}&token=${token}`;

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
                // Save to local cache
                resultsCache.set(cacheKey, { data: data.data, timestamp: Date.now() });
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
    const BATCH_SIZE = 25; // Aggressive batching for faster results

    for (let i = 0; i < regNos.length; i += BATCH_SIZE) {
        const batch = regNos.slice(i, i + BATCH_SIZE);
        const promises = batch.map((regNo) =>
            fetchStudentResult(regNo, year, semester, examHeld)
        );

        // allSettled so one failure doesn't block the batch
        const batchResults = await Promise.allSettled(promises);

        batchResults.forEach((res) => {
            if (res.status === "fulfilled" && res.value) {
                results.push(res.value);
            }
        });
    }

    return results;
}
