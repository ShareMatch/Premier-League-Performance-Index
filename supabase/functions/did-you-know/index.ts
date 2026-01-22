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
        JSON.stringify({ fact: "Did you know? ShareMatch provides real-time tokenised trading for sports assets." }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);

    // Tightened prompt for relevance and safety
    const contextClause = market ? `specifically within the context of ${market} (Sport/League)` : 'in the context of sports and performance';
    const prompt = `Write a single, short, fascinating "Did You Know?" fact about ${assetName} ${contextClause}.
Rules:
1. It must be ONE sentence.
2. It must be interesting or obscure.
3. Focus on records, history, stats, or unique traits in their sport.
4. STRICTLY AVOID: politics, war, religion, or sensitive geopolitical topics.
5. If the asset is a country/team in a specific competition (e.g. Eurovision), focus ONLY on that competition.
Start directly with the fact.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const fact = response.text || "Did you know? ShareMatch provides real-time tokenised trading for sports assets.";

    return new Response(
      JSON.stringify({ fact }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error in did-you-know function:", error);
    const corsHeaders = publicCors(req.headers.get('origin'));
    return new Response(
      JSON.stringify({ fact: "Did you know? ShareMatch provides real-time tokenised trading for sports assets." }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});