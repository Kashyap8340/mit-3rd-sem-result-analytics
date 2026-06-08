"use server";

import { ApiResponse, StudentResult } from "@/types";

// In-memory cache for fetched results to preserve server load and avoid token consumption
// Key format: `${regNo}-${sem}-${year}`
const resultsCache = new Map<string, { data: StudentResult; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function resolveExamId(semester: string | string[], examHeld: string): Promise<string> {
    try {
        const res = await fetch("https://beu-bih.ac.in/backend/v1/result/sem-get", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://beu-bih.ac.in/",
            },
            next: { revalidate: 86400 } // Cache this list for 24 hours
        });
        if (!res.ok) return "";
        const data = await res.json();
        const btech = data.find((c: any) => c.courseid === 3);
        if (!btech) return "";
        
        // Map semester (e.g. "IV", "III", "II", "I") to numeric semId
        const semMap: { [key: string]: number } = {
            "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8,
            "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8
        };
        
        const semToTry = Array.isArray(semester) ? semester[0] : semester;
        const semId = semMap[semToTry] || 4; // fallback to 4
        
        // Find matching exam
        const match = btech.exams.find((e: any) => e.semId === semId && e.examHeld === examHeld);
        return match ? match.examId : "";
    } catch (e) {
        console.error("Failed to resolve examId:", e);
        return "";
    }
}

async function solveCaptcha(apiKey: string): Promise<string> {
    try {
        const submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=6LccKAMtAAAAAHAqgWYhfhuUiRz_M2r9hbgHhjXf&pageurl=https://beu-bih.ac.in/&json=1`;
        const submitRes = await fetch(submitUrl, { method: "GET" });
        const submitData = await submitRes.json();
        
        if (submitData.status !== 1) {
            console.error("2Captcha task submission failed:", submitData.request);
            return "";
        }
        
        const taskId = submitData.request;
        console.log(`2Captcha task submitted successfully. Task ID: ${taskId}`);

        const pollUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`;
        
        // Wait 15s initially (Standard recaptcha takes 15-30s)
        await new Promise(resolve => setTimeout(resolve, 15000));

        for (let i = 0; i < 20; i++) {
            const pollRes = await fetch(pollUrl, { method: "GET" });
            const pollData = await pollRes.json();
            
            if (pollData.status === 1) {
                console.log(`2Captcha task ${taskId} solved successfully!`);
                return pollData.request;
            }
            
            if (pollData.request === "CAPCHA_NOT_READY") {
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
            
            console.error(`2Captcha task ${taskId} failed:`, pollData.request);
            return "";
        }
        console.error(`2Captcha task ${taskId} timed out.`);
    } catch (e) {
        console.error("Error solving captcha via 2Captcha:", e);
    }
    return "";
}

export async function isAutoCaptchaEnabled(): Promise<boolean> {
    return !!process.env.TWOCAPTCHA_API_KEY;
}

export async function fetchStudentWithCaptcha(
    regNo: string,
    year: string,
    semester: string | string[],
    examHeld: string,
    captchaToken: string,
    examId?: string
): Promise<StudentResult | null> {
    try {
        // Exchange captcha token for result token
        const tokenResponse = await fetch(`https://beu-bih.ac.in/backend/v1/result/token?captcha=${encodeURIComponent(captchaToken)}`, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://beu-bih.ac.in/",
            },
            cache: "no-store",
        });

        if (!tokenResponse.ok) {
            console.error(`Failed to exchange token for ${regNo}: ${tokenResponse.status} ${tokenResponse.statusText}`);
            return null;
        }

        const tokenData = await tokenResponse.json();
        const studentToken = tokenData?.token;
        if (!studentToken) {
            console.error(`No result token returned in response for ${regNo}`);
            return null;
        }

        // Fetch the student result using the exchanged token
        return fetchStudentResult(regNo, year, semester, examHeld, studentToken, examId);
    } catch (error) {
        console.error(`Error in fetchStudentWithCaptcha for ${regNo}:`, error);
        return null;
    }
}

export async function fetchStudentResult(
    regNo: string,
    year: string,
    semester: string | string[],
    examHeld: string,
    resultToken?: string,
    examId?: string
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
            let token = resultToken;

            if (!token) {
                // 2. Fetch a fresh single-use token from the BEU backend if not provided
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
                token = tokenData?.token;
            }

            if (!token) {
                console.error(`No token returned in token response for ${regNo}`);
                continue;
            }

            // 3. Request the result using the token
            let url = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${year}&redg_no=${regNo}&semester=${sem}&exam_held=${encodeURIComponent(examHeld)}`;
            if (examId) {
                url += `&exam_id=${examId}`;
            }
            url += `&token=${token}`;

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
    examHeld: string,
    captchaToken?: string,
    manualToken?: string
): Promise<StudentResult[]> {
    const results: StudentResult[] = [];
    
    // Resolve exam_id first
    const examId = await resolveExamId(semester, examHeld);
    console.log(`Resolved exam_id for ${semester} / ${examHeld}: ${examId}`);

    const apiKey = process.env.TWOCAPTCHA_API_KEY;

    if (apiKey) {
        console.log(`Auto-captcha solving enabled via 2Captcha. Resolving results for ${regNos.length} students in batches...`);
        
        // Solve and fetch in small batches of 5 to respect 2captcha limit and server load
        const BATCH_SIZE = 5;
        for (let i = 0; i < regNos.length; i += BATCH_SIZE) {
            const batch = regNos.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(regNos.length / BATCH_SIZE)} (students: ${batch.join(', ')})`);
            
            // 1. Solve captchas in parallel for this batch
            const captchaSolvePromises = batch.map(() => solveCaptcha(apiKey));
            const solvedCaptchaTokens = await Promise.all(captchaSolvePromises);
            
            // 2. Exchange captcha tokens for result tokens and fetch results in parallel
            const fetchPromises = batch.map(async (regNo, index) => {
                const cToken = solvedCaptchaTokens[index];
                if (!cToken) {
                    console.error(`Skipping ${regNo} because captcha solving failed.`);
                    return null;
                }
                
                try {
                    // Exchange captcha for result token
                    const tokenResponse = await fetch(`https://beu-bih.ac.in/backend/v1/result/token?captcha=${encodeURIComponent(cToken)}`, {
                        method: "GET",
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "application/json, text/plain, */*",
                            "Referer": "https://beu-bih.ac.in/",
                        },
                        cache: "no-store",
                    });
                    
                    if (!tokenResponse.ok) {
                        console.error(`Failed to exchange token for ${regNo}: ${tokenResponse.status}`);
                        return null;
                    }
                    
                    const tokenData = await tokenResponse.json();
                    const studentToken = tokenData?.token;
                    if (!studentToken) {
                        console.error(`No result token returned for ${regNo}`);
                        return null;
                    }
                    
                    return fetchStudentResult(regNo, year, semester, examHeld, studentToken, examId);
                } catch (err) {
                    console.error(`Error fetching result for ${regNo} in auto-captcha mode:`, err);
                    return null;
                }
            });
            
            const batchResults = await Promise.allSettled(fetchPromises);
            batchResults.forEach((res) => {
                if (res.status === "fulfilled" && res.value) {
                    results.push(res.value);
                }
            });

            // Brief delay between batches
            if (i + BATCH_SIZE < regNos.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } else {
        console.log("Manual/Browser CAPTCHA mode active. (TWOCAPTCHA_API_KEY not set)");
        let resolvedToken = manualToken;

        if (!resolvedToken && captchaToken) {
            try {
                console.log("Exchanging CAPTCHA token for a result token...");
                const tokenResponse = await fetch(`https://beu-bih.ac.in/backend/v1/result/token?captcha=${encodeURIComponent(captchaToken)}`, {
                    method: "GET",
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "application/json, text/plain, */*",
                        "Referer": "https://beu-bih.ac.in/",
                    },
                    cache: "no-store",
                });

                if (tokenResponse.ok) {
                    const tokenData = await tokenResponse.json();
                    resolvedToken = tokenData?.token;
                    console.log("Successfully fetched result token using CAPTCHA:", resolvedToken);
                } else {
                    console.error("Failed to fetch result token using CAPTCHA status:", tokenResponse.status, tokenResponse.statusText);
                }
            } catch (error) {
                console.error("Error exchanging CAPTCHA token:", error);
            }
        }

        // Since the backend token is strictly single-use, we can query only one student per captcha token.
        // If the user wants a complete class analysis, they can input a list of resolved tokens sequentially or use a solver.
        // We will query with whatever token we have.
        const BATCH_SIZE = 5; 
        for (let i = 0; i < regNos.length; i += BATCH_SIZE) {
            const batch = regNos.slice(i, i + BATCH_SIZE);
            const promises = batch.map((regNo) =>
                fetchStudentResult(regNo, year, semester, examHeld, resolvedToken, examId)
            );

            const batchResults = await Promise.allSettled(promises);

            batchResults.forEach((res) => {
                if (res.status === "fulfilled" && res.value) {
                    results.push(res.value);
                }
            });
        }
    }

    return results;
}
