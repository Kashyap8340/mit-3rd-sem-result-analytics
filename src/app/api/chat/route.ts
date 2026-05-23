export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      console.error("Missing environment variable: OPENROUTER_API_KEY");
      return new Response(
        JSON.stringify({ 
          error: "API Key Configuration Missing. Please set the OPENROUTER_API_KEY environment variable in your Vercel project dashboard." 
        }), 
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const MODELS = [
      "openrouter/free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "google/gemma-2-9b-it:free",
      "qwen/qwen-2.5-7b-instruct:free"
    ];

    let response: Response | null = null;
    let lastErrorMsg = "";

    for (const modelName of MODELS) {
      try {
        console.log(`Attempting OpenRouter completion with: ${modelName}`);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "BEU Results Analytics",
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            stream: true,
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          response = res;
          break; // Success! Exit loop.
        } else {
          const errorBody = await res.text();
          console.warn(`OpenRouter model ${modelName} failed:`, res.status, errorBody);
          lastErrorMsg = `Model ${modelName} returned status ${res.status}: ${errorBody}`;
        }
      } catch (err: any) {
        console.warn(`Fetch error for model ${modelName}:`, err);
        lastErrorMsg = err?.message || String(err);
      }
    }

    if (!response) {
      console.error("All OpenRouter models failed. Last error:", lastErrorMsg);
      return new Response(JSON.stringify({ error: `All models failed: ${lastErrorMsg}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: "No response body" }), { status: 500 });
    }

    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
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
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
