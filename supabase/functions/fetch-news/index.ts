import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { restrictedCors } from "../_shared/cors.ts";
import {
  TOPIC_SEARCH_MAP,
  LEAGUE_DISPLAY_NAMES,
  FETCH_NEWS_PROMPT,
} from "../_shared/prompts/index.ts";
import { interpolate } from "../_shared/prompts/utils.ts";

serve(async (req) => {
  const corsHeaders = restrictedCors(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { topic, apiKey: bodyApiKey, force = false } = await req.json();

    // ── Build effective search query ───────────────────────────────
    let effectiveSearchQuery = TOPIC_SEARCH_MAP[topic] || "Sports news";

    if (topic.startsWith("team:")) {
      const parts = topic.split(":");
      const teamName = parts[1]?.trim() || "";
      const leagueCode = parts[2]?.trim() || "";

      const leagueName = LEAGUE_DISPLAY_NAMES[leagueCode] || leagueCode || "sports";

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

    // Use shared prompt with interpolation
    const prompt = interpolate(FETCH_NEWS_PROMPT, { searchQuery: effectiveSearchQuery });

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
      // Delete only very old articles
      await supabase
        .from("news_articles")
        .delete()
        .eq("topic", topic)
        .lt(
          "published_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
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
