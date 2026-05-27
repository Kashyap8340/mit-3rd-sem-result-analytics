export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Ordered by speed: smaller models first, they respond faster
const FAST_MODELS = [
  "nvidia/nemotron-nano-9b-v2:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "z-ai/glm-4.5-air:free",
  "poolside/laguna-m.1:free",
];

const BACKUP_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-v4-flash:free",
  "google/gemma-4-26b-a4b-it:free",
];

const TIMEOUT_MS = 12_000;

/**
 * Race multiple models simultaneously — first valid response wins.
 * This is the key optimization: instead of sequential fallback (slow),
 * we fire 3 models at once and stream whichever answers first.
 */
async function raceModels(
  apiKey: string,
  messages: any[],
  models: string[],
  stream: boolean
): Promise<Response | null> {
  const controller = new AbortController();

  const attempts = models.map(async (model): Promise<Response | null> => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mit-result.vercel.app",
          "X-Title": "BEU Results Analytics",
        },
        body: JSON.stringify({
          model,
          messages,
          stream,
          max_tokens: 450,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        console.warn(`[AI] ${model} => ${res.status}`);
        return null;
      }

      if (!stream) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content && content.trim().length > 20) {
          console.log(`[AI] ✓ Won race (non-stream): ${model}`);
          controller.abort(); // Cancel others
          return new Response(content, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        return null;
      }

      // For streaming: validate first chunk exists before declaring winner
      const reader = res.body?.getReader();
      if (!reader) return null;

      const decoder = new TextDecoder();
      let buffer = "";
      let firstContent = "";

      // Read until we get actual content (not just SSE headers)
      const deadline = Date.now() + 8_000;
      while (Date.now() < deadline) {
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
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) firstContent += c;
          } catch {}
        }

        if (firstContent.length > 0) break; // Got content — this model wins
      }

      if (!firstContent) return null;

      // This model won the race! Abort others and stream the rest
      console.log(`[AI] ✓ Won race (stream): ${model}`);
      controller.abort();

      const passthrough = new ReadableStream({
        async start(ctrl) {
          try {
            // Emit the content we already read
            ctrl.enqueue(new TextEncoder().encode(firstContent));

            // Continue streaming the rest
            while (true) {
              const { done: d, value: v } = await reader.read();
              if (d) break;
              buffer += decoder.decode(v, { stream: true });
              const ls = buffer.split("\n");
              buffer = ls.pop() || "";
              for (const l of ls) {
                const t = l.trim();
                if (!t || !t.startsWith("data: ")) continue;
                const dd = t.slice(6);
                if (dd === "[DONE]") continue;
                try {
                  const p = JSON.parse(dd);
                  const c = p.choices?.[0]?.delta?.content;
                  if (c) ctrl.enqueue(new TextEncoder().encode(c));
                } catch {}
              }
            }
            ctrl.close();
          } catch {
            ctrl.close();
          }
        },
      });

      return new Response(passthrough, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn(`[AI] ${model} error:`, err?.message);
      }
      return null;
    }
  });

  // Race: first non-null response wins
  try {
    const result = await Promise.any(
      attempts.map(async (p) => {
        const r = await p;
        if (!r) throw new Error("skip");
        return r;
      })
    );
    return result;
  } catch {
    return null;
  } finally {
    // Cleanup: abort any still-running requests
    setTimeout(() => {
      try { controller.abort(); } catch {}
    }, 500);
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

    // ── Round 1: Race fast models (streaming) ──────────────────
    console.log("[AI] Racing fast models (stream)...");
    const streamResult = await Promise.race([
      raceModels(apiKey, messages, FAST_MODELS, true),
      new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS)),
    ]);

    if (streamResult) return streamResult;

    // ── Round 2: Race backup models (non-streaming, faster response) ─
    console.log("[AI] Racing backup models (non-stream)...");
    const nonStreamResult = await Promise.race([
      raceModels(apiKey, messages, [...BACKUP_MODELS, ...FAST_MODELS], false),
      new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS)),
    ]);

    if (nonStreamResult) return nonStreamResult;

    // ── All failed ─────────────────────────────────────────────
    console.error("[AI] All models failed");
    return new Response(
      "⚠️ AI models are busy right now. Please click **Retry Report** to try again.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  } catch (error: any) {
    console.error("[AI] Fatal:", error);
    return new Response(
      "⚠️ An error occurred. Please click **Retry Report**.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
