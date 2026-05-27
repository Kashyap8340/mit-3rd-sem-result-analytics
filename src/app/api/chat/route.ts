export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "z-ai/glm-4.5-air:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "poolside/laguna-m.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-v4-flash:free",
  "google/gemma-4-26b-a4b-it:free",
];

const TIMEOUT_MS = 20_000;

async function tryNonStreaming(
  apiKey: string,
  messages: any[],
  modelName: string
): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

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
        model: modelName,
        messages,
        stream: false,
        max_tokens: 700,
        temperature: 0.7,
      }),
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    return content && content.trim().length > 20 ? content : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Strategy 1: Try streaming with each model ──────────────
    for (const modelName of MODELS) {
      try {
        console.log(`[AI] Trying stream: ${modelName}`);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

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
            model: modelName,
            messages,
            stream: true,
            max_tokens: 700,
            temperature: 0.7,
          }),
        });

        clearTimeout(timer);

        if (!res.ok) {
          console.warn(`[AI] ${modelName} HTTP ${res.status}`);
          continue;
        }

        const reader = res.body?.getReader();
        if (!reader) continue;

        // Simple pass-through stream that parses SSE
        const stream = new ReadableStream({
          async start(controller) {
            const decoder = new TextDecoder();
            let buffer = "";
            let hasContent = false;

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith("data: ")) continue;
                  const data = trimmed.slice(6);
                  if (data === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      hasContent = true;
                      controller.enqueue(new TextEncoder().encode(content));
                    }
                  } catch {
                    // skip malformed
                  }
                }
              }

              if (!hasContent) {
                // Stream produced nothing — signal an error so the client retries
                controller.enqueue(
                  new TextEncoder().encode(
                    "⚠️ Model returned empty. Click **Retry Report** to try again."
                  )
                );
              }
              controller.close();
            } catch (err) {
              console.warn(`[AI] ${modelName} stream error:`, err);
              controller.error(err);
            }
          },
        });

        console.log(`[AI] ✓ Streaming: ${modelName}`);
        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch (err: any) {
        console.warn(`[AI] ${modelName} failed:`, err?.message || err);
        continue;
      }
    }

    // ── Strategy 2: Non-streaming fallback ─────────────────────
    console.log("[AI] All streaming failed, trying non-streaming...");

    for (const modelName of MODELS) {
      console.log(`[AI] Trying non-stream: ${modelName}`);
      const content = await tryNonStreaming(apiKey, messages, modelName);
      if (content) {
        console.log(`[AI] ✓ Non-streaming: ${modelName}`);
        return new Response(content, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    // ── All failed ─────────────────────────────────────────────
    console.error("[AI] All models failed");
    return new Response(
      "⚠️ All AI models are currently busy. Please click **Retry Report** to try again.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  } catch (error: any) {
    console.error("[AI] Fatal:", error);
    return new Response(
      "⚠️ An unexpected error occurred. Please click **Retry Report**.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
