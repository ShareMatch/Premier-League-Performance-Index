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
    console.log("🚀 AI Analytics function called");

    // Require authentication
    const authResult = await requireAuthUser(req);
    if (authResult.error) {
      console.error("❌ Auth failed:", authResult.error);
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: authResult.error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Auth successful for user:", authResult.authUserId);

    // ✅ Default chatHistory to empty array to handle first message
    const { teams, selectedMarket, userQuery, chatHistory = [] } = await req.json();
    console.log(
      "📥 Request data - teams count:",
      teams?.length,
      "market:",
      selectedMarket,
      "userQuery:",
      userQuery,
      "chatHistory:",
      chatHistory?.length,
    );

    // Debug: Show full chat history with user ID
    console.log(
      `📝 Chat history for user ${authResult.authUserId} (Supabase session ID):`,
      chatHistory.map((m: any, index: number) => ({
        index,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }))
    );


    const missingFields = [];
    if (!teams || teams.length === 0) missingFields.push("teams");
    if (!selectedMarket) missingFields.push("selectedMarket");
    if (!userQuery) missingFields.push("userQuery");
    // No need to check chatHistory - it defaults to []

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing field(s): ${missingFields.join(", ")}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
      .join(", ");

    const today = new Date().toISOString().split("T")[0];

    // ✅ Convert chat history to text format for the prompt
    const historyText = chatHistory
      .map((m: any) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
      .join("\n\n");

    // ✅ Build the full prompt with chat history included
    const fullPrompt = `You are an Expert Sports Analyst for the ShareMatch trading platform.

Market: ${selectedMarket} Index
Date: ${today}
Current Market Prices: ${marketTeams}

${historyText ? `CONVERSATION HISTORY:\n${historyText}\n\n` : ""}CURRENT USER QUESTION: ${userQuery}

IMPORTANT INSTRUCTIONS:
1. If the user asks a conversational question (like "what was my last question?", "tell me more", "what about [team]?", "explain that", etc.), answer it directly and conversationally WITHOUT doing a full market analysis.
2. If the user asks about specific teams/players mentioned in the conversation history, provide focused updates on those specific entities.
3. Only do a FULL MARKET ANALYSIS (with all sections below) if the user asks a new analytical question about market trends, valuations, or wants a comprehensive breakdown.

FOR CONVERSATIONAL QUESTIONS:
- Answer directly in 1-3 paragraphs
- Reference the conversation history when relevant
- Be concise and to-the-point
- DO NOT include section headers like "## Latest News"

FOR ANALYTICAL QUESTIONS, COMPLETE THESE TASKS:
1. SEARCH THE WEB for the latest breaking news, injuries, suspensions, and team morale impacting these specific teams/drivers from the last 24-48 hours.
2. Provide a technical analysis of the market based on current form, fundamentals, performance, and momentum.
3. Identify 1 Undervalued Asset and 1 Overvalued Asset based on the divergence between sentiment and current market price.

FORMAT RULES (for analytical responses):
- Use clean Markdown with ## for section headers (NOT #)
- Use bullet points for lists
- DO NOT include any title or header at the very beginning - start directly with the "## Latest News, Injuries, and Team Morale:" section
- Keep each team's update to 2-3 sentences max for conciseness

SECTIONS TO INCLUDE (in this exact order for analytical responses):
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

Style: Professional, insightful, concise, data-driven.`;

    console.log(
      "🤖 Calling Gemini API with model: gemini-2.0-flash + googleSearch",
    );
    console.log("📝 Full prompt length:", fullPrompt.length);
    console.log("💬 Chat history entries:", chatHistory.length);

    try {
      // ✅ Use the correct API method: getGenerativeModel + generateContentStream
      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        tools: [{ googleSearch: {} }],
      });

      // ✅ Use generateContentStream instead of chatStream
      const streamingResponse = await model.generateContentStream(fullPrompt);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamingResponse.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                controller.enqueue(new TextEncoder().encode(chunkText));
              }
            }
            controller.close();
          } catch (err) {
            console.error("❌ Streaming error:", err);
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (geminiError: any) {
      console.error("❌ Gemini API error:", geminiError.message, geminiError);

      // Check if it's a quota error
      const errorMessage = geminiError.message || "";
      if (
        errorMessage.includes("quota") ||
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED")
      ) {
        return new Response(
          JSON.stringify({
            analysis:
              "**AI Analysis Temporarily Unavailable**\n\nThe AI service is currently experiencing high demand. Please try again in a few minutes.\n\n_Tip: The free tier has limited requests per minute and per day. Consider upgrading your Gemini API plan for higher limits._",
          }),
          {
            status: 200, // Return 200 with a message instead of error
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          analysis:
            "**Unable to Generate Analysis**\n\nThe AI service encountered an error. Please try again later.",
        }),
        {
          status: 200, // Return 200 with fallback message
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Error in ai-analytics function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate analysis" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});