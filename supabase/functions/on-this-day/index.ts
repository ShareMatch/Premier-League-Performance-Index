import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { publicCors } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const corsHeaders = publicCors(req.headers.get('origin'));

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { assetName, market } = await req.json();

    if (!assetName) {
      return new Response(
        JSON.stringify({ error: "Missing assetName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ fact: `On this day, ${assetName} fans are engaging with the Performance Index.` }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    const contextClause = market ? `specifically for ${market}` : 'in sports history';
    const prompt = `Write a short "On This Day" (${dateString}) historical fact about ${assetName} ${contextClause}.
Rules:
1. It MUST be historically accurate for TODAY'S DATE (${dateString}).
2. If no specific event happened on this exact date for ${assetName}, find a significant event from this WEEK in history.
3. Keep it to one interesting sentence.
4. STRICTLY AVOID: politics, war, religion.
5. Focus on wins, records, signings, or legendary moments.
Start directly with the fact.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const fact = response.text || `On this day, ${assetName} fans are engaging with the Performance Index.`;

    return new Response(
      JSON.stringify({ fact }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error in on-this-day function:", error);
    const corsHeaders = publicCors(req.headers.get('origin'));
    return new Response(
      JSON.stringify({ fact: "On this day, ShareMatch users are exploring sports performance data." }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});