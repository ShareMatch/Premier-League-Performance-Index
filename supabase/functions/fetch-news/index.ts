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

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            tools: [{ googleSearch: {} }],
            systemInstruction: "You are a news aggregator. You strictly output a JSON array of news items based on Google Search results.",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
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
