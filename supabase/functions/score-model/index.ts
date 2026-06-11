// ResoFlex™ Powered scoring for a model: fetch profile + photos, scrape Instagram via Firecrawl,
// call Lovable AI Gateway (ResoFlex™ Powered) with vision + tool-calling for structured JSON.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

interface ScoreResult {
  score: number;
  category: "Platinum" | "Commercial" | "Influencer" | "Training";
  reasoning: string;
  strengths: string[];
  improvements: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { model_id } = await req.json();
    if (!model_id || typeof model_id !== "string") {
      return new Response(JSON.stringify({ error: "model_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch model
    const { data: model, error: modelErr } = await supabase
      .from("models").select("*, model_photos(storage_path, position)").eq("id", model_id).maybeSingle();
    if (modelErr || !model) throw new Error("Model not found");

    // Sign first 4 photos
    const photos = (model.model_photos || []).sort((a: any, b: any) => a.position - b.position).slice(0, 4);
    const signedPhotos: string[] = [];
    for (const p of photos) {
      const { data } = await supabase.storage.from("model-photos").createSignedUrl(p.storage_path, 600);
      if (data?.signedUrl) signedPhotos.push(data.signedUrl);
    }

    // Try Firecrawl IG scrape (best-effort)
    let ig_followers: number | null = null;
    let ig_summary = "";
    if (model.instagram && FIRECRAWL_API_KEY) {
      try {
        const igUrl = `https://www.instagram.com/${model.instagram}/`;
        const fcRes = await fetch(`${FIRECRAWL_GATEWAY}/scrape`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": FIRECRAWL_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: igUrl,
            formats: ["summary"],
            onlyMainContent: true,
          }),
        });
        if (fcRes.ok) {
          const fcData = await fcRes.json();
          ig_summary = (fcData.summary || fcData.data?.summary || "").slice(0, 800);
          // Try to extract follower count from summary text
          const m = ig_summary.match(/([\d.,]+)\s*([KMkm])?\s*followers?/i);
          if (m) {
            const num = parseFloat(m[1].replace(/,/g, ""));
            const mult = m[2]?.toLowerCase() === "m" ? 1_000_000 : m[2]?.toLowerCase() === "k" ? 1_000 : 1;
            ig_followers = Math.round(num * mult);
          }
        }
      } catch (e) {
        console.error("Firecrawl scrape failed:", e);
      }
    }

    // Build vision message
    const userContent: any[] = [
      {
        type: "text",
        text: `Model profile:
Name: ${model.full_name}
Age: ${model.age}, Gender: ${model.gender}
Location: ${model.city}, ${model.state}
Instagram: @${model.instagram}${ig_followers ? ` (~${ig_followers.toLocaleString()} followers)` : ""}
Bio: ${model.bio}
${ig_summary ? `Instagram summary: ${ig_summary}` : ""}

Score this model for the Nigerian fashion/beauty/influencer market. Consider photo quality, presence, marketability, and (if available) social reach. Return structured JSON via the score_model tool.`,
      },
      ...signedPhotos.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You are an expert ResoFlex™ Powered modeling scout for the Nigerian market (Elite NG) (fashion, beauty, influencer). " +
              "Categories: Platinum (top editorial/high fashion 85-100), Commercial (versatile brand work 65-84), " +
              "Influencer (social-first creators 55-79), Training (emerging talent 30-64). Be honest but constructive.",
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_model",
              description: "Return the model's ResoFlex™ score and category.",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "0-100" },
                  category: { type: "string", enum: ["Platinum", "Commercial", "Influencer", "Training"] },
                  reasoning: { type: "string", description: "2-3 sentence summary" },
                  strengths: { type: "array", items: { type: "string" }, maxItems: 4 },
                  improvements: { type: "array", items: { type: "string" }, maxItems: 4 },
                },
                required: ["score", "category", "reasoning", "strengths", "improvements"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "score_model" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "ResoFlex™ credits exhausted. Top up in Lovable workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`ResoFlex™ gateway error ${aiRes.status}: ${txt}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned");
    const result: ScoreResult = JSON.parse(toolCall.function.arguments);

    const score = Math.max(0, Math.min(100, Math.round(result.score)));

    const { error: updErr } = await supabase
      .from("models")
      .update({
        score,
        category: result.category,
        ai_reasoning: result.reasoning,
        ai_strengths: result.strengths,
        ai_improvements: result.improvements,
        ig_followers,
        scored_at: new Date().toISOString(),
        status: "approved", // auto-approve for MVP
      })
      .eq("id", model_id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ ok: true, score, category: result.category }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-model error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
