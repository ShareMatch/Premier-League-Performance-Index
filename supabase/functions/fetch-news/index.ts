import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { topic } = await req.json();
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

        if (lastUpdated && lastUpdated > sixHoursAgo) {
            return new Response(JSON.stringify({ message: "News is fresh", updated: false }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Fetch from NewsAPI
        const apiKey = Deno.env.get("NEWS_API_KEY");
        let articles = [];

        if (apiKey) {
            const queryMap = {
                'EPL': 'Premier League football',
                'UCL': 'Champions League football',
                'SPL': 'Saudi Pro League football',
                'WC': 'FIFA World Cup',
                'F1': 'Formula 1 racing',
                'NBA': 'NBA basketball',
                'NFL': 'NFL football',
                'Eurovision': 'Eurovision Song Contest',
                'Global': 'Sports news'
            };
            const query = queryMap[topic] || 'Sports';
            const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`;

            const res = await fetch(url);
            const data = await res.json();
            if (data.status === 'ok') articles = data.articles;
            else console.error("News API Error:", data);
        }

        // 3. Insert into Database (Delete old -> Insert new)
        if (articles.length > 0) {
            // Delete old items for this topic
            await supabase.from("news_articles").delete().eq("topic", topic);

            const newsItems = articles.map((a: any) => ({
                topic,
                headline: a.title || "No Headline",
                source: a.source?.name || "Unknown",
                url: a.url,
                published_at: a.publishedAt || new Date().toISOString(),
            })).filter((i: any) => i.url && i.headline);

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

        return new Response(JSON.stringify({ message: "News updated", updated: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
