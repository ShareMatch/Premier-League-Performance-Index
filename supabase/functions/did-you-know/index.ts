import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { publicCors } from "../_shared/cors.ts";
import { DID_YOU_KNOW_PROMPT, DEFAULT_DID_YOU_KNOW } from "../_shared/prompts/index.ts";
import { interpolate, getContextClause } from "../_shared/prompts/utils.ts";

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
        JSON.stringify({ fact: DEFAULT_DID_YOU_KNOW }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);

    // Use shared prompt with interpolation
    const contextClause = getContextClause(market, 'did-you-know');
    const prompt = interpolate(DID_YOU_KNOW_PROMPT, { assetName, contextClause });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const fact = response.text || DEFAULT_DID_YOU_KNOW;

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
      JSON.stringify({ fact: DEFAULT_DID_YOU_KNOW }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
