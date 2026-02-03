import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuthUser } from "../_shared/require-auth.ts";
import {
  MARKET_ANALYSIS_PROMPT,
  MARKET_ANALYSIS_SYSTEM_INSTRUCTION,
} from "../_shared/prompts/index.ts";
import { interpolate } from "../_shared/prompts/utils.ts";

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

    // Use shared prompt with interpolation
    const prompt = interpolate(MARKET_ANALYSIS_PROMPT, { leagueName, teamData });

    const model = ai.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }],
      systemInstruction: MARKET_ANALYSIS_SYSTEM_INSTRUCTION,
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
