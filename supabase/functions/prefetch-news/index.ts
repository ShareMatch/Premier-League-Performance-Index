import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { restrictedCors } from "../_shared/cors.ts";

// All indexes/leagues to pre-fetch news for
const ALL_TOPICS = [
  "EPL",
  "UCL", 
  "SPL",
  "WC",
  "F1",
  "NBA",
  "NFL",
  "T20",
  "Eurovision",
  "Global",
];

// Topic → Search Query mapping
const topicMap: Record<string, string> = {
  EPL: "Premier League football news, transfers, matches, table",
  UCL: "UEFA Champions League latest news and results",
  SPL: "Saudi Pro League football news",
  WC: "FIFA World Cup news",
  F1: "Formula 1 racing news, qualifying, race results",
  NBA: "NBA basketball news, trades, injuries",
  NFL: "NFL American football news",
  T20: "T20 Cricket World Cup news and scores",
  Eurovision: "Eurovision Song Contest latest news",
  Global: "Major global sports headlines today",
};

// Helper: date string for recency filter
const threeDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().split("T")[0];
};

async function fetchNewsForTopic(
  supabase: any,
  genAI: any,
  topic: string
): Promise<{ topic: string; status: string; count: number; error?: string }> {
  try {
    // Check freshness
    const { data: updateData } = await supabase
      .from("news_updates")
      .select("last_updated_at")
      .eq("topic", topic)
      .single();

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const lastUpdated = updateData?.last_updated_at
      ? new Date(updateData.last_updated_at)
      : null;

    // Skip if recently updated
    if (lastUpdated && lastUpdated > sixHoursAgo) {
      return { topic, status: "skipped", count: 0 };
    }

    const effectiveSearchQuery = topicMap[topic] || "Sports news today";

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }],
    });

    const prompt = `Search the web for the most recent news about: ${effectiveSearchQuery}

Focus on:
- Player or team performances
- Injuries and recovery updates
- Confirmed transfers or strong rumors from reputable sources
- Contract negotiations
- Manager or coach comments
- Upcoming matches or fixtures

Rules:
- STRICTLY only articles from the LAST 24 HOURS - this is critical for freshness
- Sources can be ANY reputable sports news outlet (BBC Sport, Sky Sports, ESPN, The Athletic, Goal.com, Bleacher Report, Reuters Sports, AP Sports, official league sites, major newspapers sports sections, etc.)
- DO NOT include betting, odds, fantasy sports, casino, or any gambling content
- NO clickbait, low-quality, or unrelated content
- Prioritize breaking news and major developments

Output Format:
- Strictly return **only** a clean JSON array of up to 8 objects
- Use this exact format and nothing else:

[
  {
    "headline": "Article Title",
    "source": "Publisher Name",
    "published_at": "YYYY-MM-DDTHH:mm:ssZ",
    "url": "https://full-article-url"
  }
]

No explanations, no markdown, no commentary, no extra text outside the JSON array. NOTHING else.`;

    const result = await model.generateContent(prompt);
    const generatedText = (await result.response).text();

    const cleanedText = generatedText.replace(/```json\n?|\n?```/g, "").trim();

    let articles: any[] = [];
    try {
      articles = JSON.parse(cleanedText || "[]");
      if (!Array.isArray(articles)) articles = [];
    } catch (e) {
      console.error(`JSON parse failed for ${topic}:`, e);
      return { topic, status: "error", count: 0, error: "JSON parse failed" };
    }

    if (articles.length > 0) {
      // Delete old articles (older than 7 days)
      await supabase
        .from("news_articles")
        .delete()
        .eq("topic", topic)
        .lt(
          "published_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        );

      const newsItems = articles.map((a: any) => ({
        topic,
        headline: a.headline || "News Update",
        source: a.source || "ShareMatch Wire",
        url: a.url || null,
        published_at: a.published_at || new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("news_articles")
        .insert(newsItems);

      if (insertError) {
        console.error(`Insert error for ${topic}:`, insertError);
        return { topic, status: "error", count: 0, error: insertError.message };
      }

      // Update timestamp
      await supabase
        .from("news_updates")
        .upsert({ topic, last_updated_at: new Date().toISOString() });

      return { topic, status: "updated", count: articles.length };
    }

    return { topic, status: "empty", count: 0 };
  } catch (error: any) {
    console.error(`Error fetching news for ${topic}:`, error);
    return { topic, status: "error", count: 0, error: error.message };
  }
}

serve(async (req) => {
  const corsHeaders = restrictedCors(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Optional: Accept specific topics or fetch all
    let topicsToFetch = ALL_TOPICS;
    
    try {
      const body = await req.json();
      if (body?.topics && Array.isArray(body.topics)) {
        topicsToFetch = body.topics;
      }
    } catch {
      // No body or invalid JSON, use default topics
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Fetch news for each topic sequentially to avoid rate limits
    const results: any[] = [];
    
    for (const topic of topicsToFetch) {
      console.log(`Fetching news for: ${topic}`);
      const result = await fetchNewsForTopic(supabase, genAI, topic);
      results.push(result);
      
      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const summary = {
      total: results.length,
      updated: results.filter((r) => r.status === "updated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      details: results,
    };

    console.log("Prefetch complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Prefetch error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
