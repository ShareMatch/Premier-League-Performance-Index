import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuthUser } from "../_shared/require-auth.ts";

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'), true);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🚀 AI Analytics function called");

    // Require authentication
    const authResult = await requireAuthUser(req);
    if (authResult.error) {
      console.error("❌ Auth failed:", authResult.error);
      return new Response(
        JSON.stringify({ error: authResult.error.message }),
        {
          status: authResult.error.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("✅ Auth successful for user:", authResult.authUserId);

    const { teams, selectedMarket } = await req.json();
    console.log("📥 Request data - teams count:", teams?.length, "market:", selectedMarket);

    if (!teams || !selectedMarket) {
      return new Response(
        JSON.stringify({ error: "Missing teams or selectedMarket" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY not found");
      return new Response(
        JSON.stringify({ error: "API configuration missing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("🔑 Gemini API key found, initializing AI client");
    const ai = new GoogleGenerativeAI(apiKey);

    // Prepare team data for selected market (top 8 teams)
    const marketTeams = teams
      .filter((t: any) => t.market === selectedMarket)
      .sort((a: any, b: any) => b.offer - a.offer)
      .slice(0, 8)
      .map((t: any) => `${t.name} (${t.offer.toFixed(1)}%)`)
      .join(', ');

    const today = new Date().toISOString().split('T')[0];
    
    const prompt = `You are an Expert Sports Analyst for the ShareMatch trading platform.

Market: ${selectedMarket} Index
Date: ${today}
Current Market Prices: ${marketTeams}

TASK:
1. SEARCH THE WEB for the latest breaking news, injuries, suspensions, and team morale impacting these specific teams/drivers from the last 24-48 hours.
2. Provide a technical analysis of the market based on current form, fundamentals, performance, and momentum.
3. Identify 1 Undervalued Asset and 1 Overvalued Asset based on the divergence between sentiment and current market price.

FORMAT RULES:
- Use clean Markdown with ## for section headers (NOT #)
- Use bullet points for lists
- DO NOT include any title or header at the very beginning - start directly with the "## Latest News, Injuries, and Team Morale:" section
- Keep each team's update to 2-3 sentences max for conciseness

SECTIONS TO INCLUDE (in this exact order):
## Latest News, Injuries, and Team Morale:
[For each major team: recent match results, injury updates, transfer news, manager comments - from your web search]

## Technical Analysis:
[Fundamentals, Performance, Momentum analysis based on current standings and form]

## Undervalued and Overvalued Assets:
[One undervalued asset with reasoning, one overvalued asset with reasoning]

STRICT TERMINOLOGY GUIDELINES:
- DO NOT use religious terms like "Halal", "Islamic", "Sharia", "Haram"
- DO NOT use gambling terms like "bet", "odds", "wager", "gamble". Use "trade", "position", "sentiment", "forecast"
- DO NOT use "Win" or "Winner" when referring to the market outcome. Use "Top the Index" or "finish first"
- DO NOT provide meta-commentary or conversational openings. Start immediately with the first section.

Style: Professional, insightful, concise, data-driven.`;

    console.log("🤖 Calling Gemini API with model: gemini-2.5-flash + googleSearch");
    console.log("📝 Prompt length:", prompt.length);

    try {
      // Use flash model WITH googleSearch for real-time news and injury data
      const model = ai.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ googleSearch: {} }],
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;

      console.log("🔄 Gemini response received");
      const analysis = response.text() || 'Analysis currently unavailable. Please try again.';
      console.log("✅ AI analysis completed, length:", analysis.length);

      return new Response(
        JSON.stringify({ analysis }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );

    } catch (geminiError: any) {
      console.error("❌ Gemini API error:", geminiError.message, geminiError);
      
      // Check if it's a quota error
      const errorMessage = geminiError.message || "";
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        return new Response(
          JSON.stringify({ 
            analysis: "**AI Analysis Temporarily Unavailable**\n\nThe AI service is currently experiencing high demand. Please try again in a few minutes.\n\n_Tip: The free tier has limited requests per minute and per day. Consider upgrading your Gemini API plan for higher limits._"
          }),
          {
            status: 200, // Return 200 with a message instead of error
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          analysis: "**Unable to Generate Analysis**\n\nThe AI service encountered an error. Please try again later."
        }),
        {
          status: 200, // Return 200 with fallback message
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

  } catch (error) {
    console.error("Error in ai-analytics function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate analysis" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});