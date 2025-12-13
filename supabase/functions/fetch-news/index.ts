import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { topic, apiKey: bodyApiKey, force } = await req.json();

        // Define topic map EARLY to use in search
        const topicMap: Record<string, string> = {
            'EPL': 'Premier League football news, transfers, and match reports',
            'UCL': 'Champions League football news',
            'SPL': 'Saudi Pro League football news',
            'WC': 'FIFA World Cup news',
            'F1': 'Formula 1 racing news and results',
            'NBA': 'NBA basketball news and trades',
            'NFL': 'NFL football news',
            'T20': 'T20 Cricket World Cup news and scores', // Added T20
            'Eurovision': 'Eurovision Song Contest latest news and odds',
            'Global': 'Major sports news headlines'
        };

        const searchQuery = topicMap[topic] || 'Sports news';

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Check if update needed (Logic preserved)
        const { data: updateData } = await supabase
            .from("news_updates")
            .select("last_updated_at")
            .eq("topic", topic)
            .single();

        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const lastUpdated = updateData?.last_updated_at ? new Date(updateData.last_updated_at) : null;

        if (!force && lastUpdated && lastUpdated > sixHoursAgo) {
            return new Response(JSON.stringify({ message: "News is fresh", updated: false }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Fetch from Gemini
        const apiKey = Deno.env.get("GEMINI_API_KEY") || bodyApiKey;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            tools: [{ googleSearch: {} }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Search for the latest news about: "${searchQuery}".
        
        Strictly output a JSON ARRAY of 5 objects. format:
        [
          {
            "headline": "Article Title",
            "source": "Publisher Name",
            "published_at": "ISO date string (must be recent)",
            "url": "https://link-to-article"
          }
        ]
        
        Include legitimate URLs found in the search results.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        const cleanedText = generatedText.replace(/```json\n|\n```|```/g, "").trim();

        let articles = [];
        try {
            articles = JSON.parse(cleanedText || "[]");
        } catch (e) {
            console.error("Failed to parse JSON:", e);
            throw new Error(`JSON Parse Error: ${e.message}. Cleaned Text: ${cleanedText}`);
        }

        // 3. Database Update
        let dbStatus = "skipped";

        // Only update timestamp if we actually got news
        if (Array.isArray(articles) && articles.length > 0) {
            // Delete old
            await supabase.from("news_articles").delete().eq("topic", topic);

            const newsItems = articles.map((a: any) => ({
                topic,
                headline: a.headline || "News Update",
                source: a.source || "ShareMatch Wire",
                url: a.url || null,
                published_at: a.published_at || new Date().toISOString(),
            }));

            // Insert new
            const { error: insertError } = await supabase.from("news_articles").insert(newsItems);
            if (insertError) throw insertError;
            dbStatus = "updated";

            // 4. Update Timestamp - ONLY on success
            await supabase.from("news_updates").upsert({ topic, last_updated_at: new Date().toISOString() });
        } else {
            console.warn("No articles found in response");
            // Do NOT update timestamp so it retries
            return new Response(JSON.stringify({
                message: "No articles found",
                dbStatus: "empty",
                count: 0,
                debug_raw: generatedText
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({
            message: "Success",
            dbStatus,
            count: articles.length,
            debug_raw: generatedText // Returinig raw text for debugging
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 200, // Return 200 so client can read the error message
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
});
