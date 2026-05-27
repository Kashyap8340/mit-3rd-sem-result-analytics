export const dynamic = "force-dynamic";

// We use the two most reliable free models on OpenRouter.
// We avoid racing to stay within the free tier rate limits (1 request/sec)
// and prevent multiple requests from exhausting the daily quota.
const MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
];

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response("⚠️ API key not configured.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Try models sequentially to avoid concurrent rate limits (429)
    for (const model of MODELS) {
      console.log(`[AI] Attempting completion with model: ${model}`);
      try {
        const ctrl = new AbortController();
        // Tight 8s timeout to return control before Vercel Hobby's strict 10s timeout
        const timer = setTimeout(() => ctrl.abort(), 8000);

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://mit-result.vercel.app",
            "X-Title": "BEU Results Analytics",
          },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            max_tokens: 450,
            temperature: 0.7,
          }),
        });

        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content;
          if (content && content.trim().length > 10) {
            console.log(`[AI] Successfully fetched response from ${model}`);
            return new Response(content, {
              status: 200,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          }
        } else {
          const errText = await res.text();
          console.warn(`[AI] Model ${model} failed with status ${res.status}:`, errText);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.warn(`[AI] Model ${model} timed out after 8s`);
        } else {
          console.warn(`[AI] Error calling ${model}:`, err.message || err);
        }
      }
    }

    // If all attempts failed, return a 503 Service Unavailable so client knows to use local fallback
    return new Response("AI service is currently busy.", { status: 503 });
  } catch (error: any) {
    console.error("[AI] Fatal error in route:", error?.message || error);
    return new Response("Internal server error.", { status: 500 });
  }
}
