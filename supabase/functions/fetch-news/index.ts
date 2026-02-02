import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { restrictedCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = restrictedCors(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { topic, apiKey: bodyApiKey, force = false } = await req.json();

    // ── Topic → Search Query mapping ───────────────────────────────
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

    // Helper: date string for recency filter (24 hours ago)
    // const oneDayAgo = () => {
    //   const d = new Date();
    //   d.setDate(d.getDate() - 1);
    //   return d.toISOString().split("T")[0];
    // };

    // ── Build effective search query ───────────────────────────────
    let effectiveSearchQuery = topicMap[topic] || "Sports news";

    if (topic.startsWith("team:")) {
      const parts = topic.split(":");
      const teamName = parts[1]?.trim() || "";
      const leagueCode = parts[2]?.trim() || "";

      // Build context-aware search for the specific team/player
      const leagueNames: Record<string, string> = {
        EPL: "Premier League",
        UCL: "Champions League",
        SPL: "Saudi Pro League",
        WC: "FIFA World Cup 2026",
        F1: "Formula 1 2026 season",
        NBA: "NBA",
        NFL: "NFL",
        T20: "T20 Cricket World Cup",
        Eurovision: "Eurovision 2026",
      };

      const leagueName = leagueNames[leagueCode] || leagueCode || "sports";

      // More specific search query for teams/players
      effectiveSearchQuery = `"${teamName}" in "${leagueName}"`;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check freshness (unless force=true)
    const { data: updateData } = await supabase
      .from("news_updates")
      .select("last_updated_at")
      .eq("topic", topic)
      .single();

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const lastUpdated = updateData?.last_updated_at
      ? new Date(updateData.last_updated_at)
      : null;

    if (!force && lastUpdated && lastUpdated > sixHoursAgo) {
      return new Response(
        JSON.stringify({ message: "News is fresh", updated: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Gemini call
    const apiKey = Deno.env.get("GEMINI_API_KEY") || bodyApiKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }],
    });

    const prompt = `You MUST use the Google Search tool to fetch live articles for: "${effectiveSearchQuery}".
      Do NOT use your internal knowledge. Only return information from the search results.

Find 5-8 recent news articles covering:
- Match results and performances
- Injuries and recovery updates
- Transfer news and rumors
- Contract negotiations
- Manager/coach statements
- Upcoming fixtures and predictions

RULES:
- Articles must be from the LAST 24 HOURS
- Use reputable sports sources (BBC Sport, Sky Sports, ESPN, The Athletic, Goal.com, etc.)
- NO betting/gambling content
- NO clickbait or low-quality sources

Strictly output a JSON ARRAY of 5 objects. format:
        [
          {
            "headline": "Article Title",
            "source": "Publisher Name",
            "published_at": "ISO date string (must be recent)",
            "url": "https://link-to-article"
          }
        ]

Return ONLY the JSON array. No text before or after.`;

    const result = await model.generateContent(prompt);
    const generatedText = (await result.response).text();

    const cleanedText = generatedText.replace(/```json\n?|\n?```/g, "").trim();

    let articles: any[] = [];
    try {
      articles = JSON.parse(cleanedText || "[]");
      if (!Array.isArray(articles)) articles = [];
    } catch (e) {
      console.error("JSON parse failed:", e, "\nRaw:", generatedText);
      throw new Error(`Failed to parse Gemini response as JSON`);
    }

    // 3. Database operations
    let dbStatus = "skipped";

    if (articles.length > 0) {
      // Recommended: don't delete everything — especially bad for team topics!
      // Alternative A: delete only very old articles
      await supabase
        .from("news_articles")
        .delete()
        .eq("topic", topic)
        .lt(
          "published_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        );

      // Alternative B: just insert new ones (most projects do this + client filtering)
      // await supabase.from("news_articles").insert(...)

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

      if (insertError) throw insertError;

      dbStatus = "updated";

      // Update timestamp
      await supabase
        .from("news_updates")
        .upsert({ topic, last_updated_at: new Date().toISOString() });
    }

    return new Response(
      JSON.stringify({
        message: "Success",
        dbStatus,
        count: articles.length,
        debug_raw: generatedText.substring(0, 800) + "...",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Edge function error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        debug: error.stack?.substring(0, 400),
      }),
      {
        status: 200, // client can still read the message
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
