import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.1.3";

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
        if (!topic) throw new Error("Topic is required");

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Check if update needed
        const { data: updateData } = await supabase
            .from("news_updates")
            .select("last_updated_at")
            .eq("topic", topic)
            .single();

        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const lastUpdated = updateData?.last_updated_at ? new Date(updateData.last_updated_at) : null;

        // Skip check if force is true
        if (!force && lastUpdated && lastUpdated > sixHoursAgo) {
            return new Response(JSON.stringify({ message: "News is fresh", updated: false }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Fetch from Google Gemini with Search Grounding
        const apiKey = Deno.env.get("GEMINI_API_KEY") || bodyApiKey;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

        const client = new GoogleGenAI({ apiKey });

        const topicMap: Record<string, string> = {
            'EPL': 'Premier League football news, transfers, and match reports',
            'UCL': 'Champions League football news',
            'SPL': 'Saudi Pro League football news',
            'WC': 'FIFA World Cup news',
            'F1': 'Formula 1 racing news and results',
            'NBA': 'NBA basketball news and trades',
            'NFL': 'NFL football news',
            'Eurovision': 'Eurovision Song Contest latest news and odds',
            'Global': 'Major sports news headlines'
        };

        const searchQuery = topicMap[topic] || 'Sports news';

        const prompt = `Find the top 5 most recent and important news articles about "${searchQuery}". 
        
        Return a JSON array where each object has:
        - headline: strict title of the article
        - source: name of the publisher (e.g. BBC, ESPN)
        - published_at: ISO date string of publication (must be recent)
        - url: link to the article (if available from search metadata, otherwise omit)
        
        Ensure the news is REAL and RECENT (last 24-48 hours). Do NOT fabricate news.`;

        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: 'application/json',
                systemInstruction: "You are a news aggregator. You strictly output a JSON array of news items based on Google Search results."
            }
        });

        const generatedText = response.text();
        console.log("Gemini Response:", generatedText);

        let articles = [];
        try {
            articles = JSON.parse(generatedText || "[]");
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", e);
            throw new Error("Failed to parse news data");
        }

        // 3. Insert into Database (Delete old -> Insert new)
        if (Array.isArray(articles) && articles.length > 0) {
            // Delete old items for this topic
            await supabase.from("news_articles").delete().eq("topic", topic);

            const newsItems = articles.map((a: any) => ({
                topic,
                headline: a.headline || "News Update",
                source: a.source || "ShareMatch Wire",
                url: a.url || null,
                published_at: a.published_at || new Date().toISOString(),
            }));

            // Insert new items
            const { error: insertError } = await supabase.from("news_articles").insert(newsItems);

            if (insertError) {
                console.error("Insert Error:", insertError);
                throw insertError;
            }
        }

        // 4. Update Timestamp
        const { error: updateError } = await supabase
            .from("news_updates")
            .upsert({ topic, last_updated_at: new Date().toISOString() });

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ message: "News updated", updated: true, count: articles.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("News Fetch Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
