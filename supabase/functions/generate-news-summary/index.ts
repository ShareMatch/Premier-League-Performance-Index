import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { restrictedCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = restrictedCors(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { headline, source, url } = await req.json(); // e.g., "Global" or "team:Arsenal:EPL"

    if (!headline || !source || !url) {
      return new Response(
        JSON.stringify({ error: "headline, source and url are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in Edge Function secrets");
      return new Response(
        JSON.stringify({ error: "API configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-001",
      tool: [{ googleSearch: {} }],
    });

    const prompt = `Write a short, engaging 3-sentence summary for this news article:

    Headline: "${headline}"
    Source: ${source}
    URL: ${url}

    Rules:
    - Keep it concise and informative
    - Focus on what this means for fans and the sport
    - Don't speculate too wildly
    - Write in an engaging, professional sports journalism style`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summaryText = response.text();

    if (!summaryText) {
      return new Response(JSON.stringify({ error: "No summary generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ summary: summaryText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Summary generation error:", error);

    // Check for specific error types
    const errorMessage = error?.message?.toLowerCase() || "";
    let userMessage = "Failed to generate summary";

    if (errorMessage.includes("quota") || errorMessage.includes("rate")) {
      userMessage = "Too many requests. Please try again in a moment.";
    } else if (
      errorMessage.includes("api key") ||
      errorMessage.includes("invalid")
    ) {
      userMessage = "API configuration error";
    }

    return new Response(JSON.stringify({ error: userMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
