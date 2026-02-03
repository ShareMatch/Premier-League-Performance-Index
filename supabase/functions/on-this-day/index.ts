import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { publicCors } from "../_shared/cors.ts";
import { ON_THIS_DAY_PROMPT, DEFAULT_ON_THIS_DAY } from "../_shared/prompts/index.ts";
import { interpolate, getContextClause, getTodayDateString } from "../_shared/prompts/utils.ts";

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
        JSON.stringify({ fact: DEFAULT_ON_THIS_DAY }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);

    // Use shared prompt with interpolation
    const dateString = getTodayDateString();
    const contextClause = getContextClause(market, 'on-this-day');
    const prompt = interpolate(ON_THIS_DAY_PROMPT, { assetName, dateString, contextClause });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const fact = response.text || DEFAULT_ON_THIS_DAY;

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
      JSON.stringify({ fact: DEFAULT_ON_THIS_DAY }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
