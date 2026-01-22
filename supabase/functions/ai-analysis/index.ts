import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuthUser } from "../_shared/require-auth.ts";

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"), true);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authResult = await requireAuthUser(req);
    if (authResult.error) {
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: authResult.error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { teams, leagueName } = await req.json();

    if (!teams || !leagueName) {
      return new Response(
        JSON.stringify({ error: "Missing teams or leagueName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API configuration missing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);

    // Prepare team data (top 10 teams)
    const teamData = teams
      .slice(0, 10)
      .map((t: any) => `${t.name}: ${t.offer.toFixed(1)}`)
      .join(", ");

    const prompt = `You are a sports market analyst focused on understanding how public information and narratives influence market behavior.

Here are the current market prices (implied probability %) for the ${leagueName} winner:
${teamData}

TASK:
1. Use Google Search to find the latest publicly available news, injuries, team form, and relevant developments for the leading contenders in the ${leagueName}.
2. Describe how this real-world information and media sentiment may be influencing market positioning and expectations.
3. Highlight where recent news or narratives appear aligned with, lagging behind, or diverging from current market pricing.

IMPORTANT CONSTRAINTS:
- Do NOT provide betting advice, investment advice, or recommendations of any kind.
- Do NOT suggest actions such as buying, selling, trading, or placing bets.
- Do NOT imply what a user "should" do.
- Do NOT mention specific percentage probabilities or prices.
- Focus strictly on descriptive, qualitative analysis of news, sentiment, and market context.

STRICT TERMINOLOGY GUIDELINES:
- DO NOT use religious terms like "Halal", "Islamic", "Sharia", "Haram". The analysis must be compliant in *principle* (ethical, no gambling), but must NOT use the labels.
- DO NOT use gambling terms like "bet", "odds", "wager", "gamble". Use "trade", "position", "sentiment", "forecast".
- DO NOT use "Win" or "Winner" when referring to the market outcome. Use "Top the Index" or "finish first".
- DO NOT provide meta-commentary or conversational openings (e.g., "Okay, here is..."). Start immediately with the content.

Style: Professional, insightful, concise, data-driven.
The response should be neutral, informational, and analytical only.
Keep it concise (under 150 words).`;

    const model = ai.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }],
      systemInstruction:
        "You are a sports market analyst focused on understanding how public information and narratives influence market behavior.",
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text() || "No analysis generated.";

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in ai-analysis function:", error.message, error);

    // Check if it's a quota error
    const errorMessage = error.message || "";
    if (
      errorMessage.includes("quota") ||
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED")
    ) {
      return new Response(
        JSON.stringify({
          analysis:
            "**AI Analysis Temporarily Unavailable**\n\nThe AI service is currently experiencing high demand. Please try again in a few minutes.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        analysis: "**Unable to Generate Analysis**\n\nPlease try again later.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
