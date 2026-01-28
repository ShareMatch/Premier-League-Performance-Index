import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuthUser } from "../_shared/require-auth.ts";

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"), true);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🚀 AI Analytics function called");

    const authResult = await requireAuthUser(req);
    if (authResult.error) {
      console.error("❌ Auth failed:", authResult.error);
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: authResult.error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Auth successful for user:", authResult.authUserId);

    const {
      teams,
      selectedMarket,
      userQuery,
      chatHistory = [],
      sessionId, // Session ID for multi-turn conversations
    } = await req.json();

    const missingFields = [];
    if (!teams || teams.length === 0) missingFields.push("teams");
    if (!selectedMarket) missingFields.push("selectedMarket");
    if (!userQuery) missingFields.push("userQuery");

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Missing field(s): ${missingFields.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get configuration from environment
    const agentStreamUrl = Deno.env.get("VERTEX_AI_AGENT_STREAM_URL");
    const apiKey = Deno.env.get("VERTEX_AI_API_KEY");
    const projectId = Deno.env.get("GCP_PROJECT_ID");
    const location = Deno.env.get("GCP_LOCATION") || "us-central1";
    const reasoningEngineId = Deno.env.get("VERTEX_AI_REASONING_ENGINE_ID");

    if (!agentStreamUrl && !reasoningEngineId) {
      console.error("❌ Missing configuration");
      return new Response(
        JSON.stringify({ error: "Agent configuration missing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!apiKey) {
      console.error("❌ Missing API key");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("🤖 Calling deployed Vertex AI agent with API key");

    // Prepare team data for context
    const marketTeams = teams
      .filter((t: { market: string }) => 
        selectedMarket === "ALL_INDEX" || 
        selectedMarket === "ALL" || 
        t.market === selectedMarket
      )
      .sort((a: { offer: number }, b: { offer: number }) => b.offer - a.offer)
      .slice(0, 8)
      .map((t: { name: string; offer: number }) => `${t.name} (${t.offer.toFixed(1)}%)`)
      .join(", ");

    const today = new Date().toISOString().split("T")[0];

    // Determine the endpoint URL
    // If using Vertex AI Agent Engine (Reasoning Engine), construct the proper URL
    let endpoint = agentStreamUrl;
    if (!endpoint && projectId && reasoningEngineId) {
      endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/reasoningEngines/${reasoningEngineId}:streamQuery`;
    }

    if (!endpoint) {
      throw new Error("No valid endpoint configured");
    }

    // Add API key to endpoint URL
    const endpointWithKey = `${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${apiKey}`;

    // Build request payload for Vertex AI Agent Engine
    // The payload structure depends on your agent's configuration
    const payload = {
      // User identification for session management
      user_id: authResult.authUserId,
      // Include session_id for conversation continuity (short-term memory)
      ...(sessionId && { session_id: sessionId }),
      // Input for the agent
      input: {
        userQuery,
        selectedMarket,
        today,
        marketTeams,
        // Include recent chat history for context
        chatHistory: chatHistory.slice(-10).map((msg: { role: string; content: string }) => ({
          role: msg.role,
          content: msg.content,
        })),
      },
      // Alternative flat structure (some agents expect this)
      userQuery,
      selectedMarket,
      today,
      marketTeams,
      chatHistory: chatHistory.slice(-10),
    };

    console.log("📤 Request payload:", JSON.stringify({ 
      user_id: payload.user_id, 
      session_id: sessionId || "new",
      selectedMarket,
      hasHistory: chatHistory.length > 0 
    }));

    const response = await fetch(endpointWithKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Agent request failed:", response.status, errorText);
      throw new Error(`Agent request failed: ${response.status} - ${errorText}`);
    }

    console.log("✅ Agent responded, streaming...");

    // Check if response includes a new session ID in headers
    const newSessionId = response.headers.get("x-session-id");

    // Create a TransformStream to potentially inject session info
    const { readable, writable } = new TransformStream();
    
    // Start piping the response
    const writer = writable.getWriter();
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error("No response body");
    }

    // Process the stream
    (async () => {
      try {
        // If we have a new session ID, prepend it as a special marker
        // The frontend can extract this from the first chunk
        if (newSessionId) {
          const sessionMarker = `<!--SESSION:${newSessionId}-->`;
          await writer.write(new TextEncoder().encode(sessionMarker));
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        // Pass session ID in response header if available
        ...(newSessionId && { "X-Session-Id": newSessionId }),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error:", errorMessage);
    return new Response(
      JSON.stringify({
        error: `AI agent error: ${errorMessage}`,
        analysis:
          "**Unable to Generate Analysis**\n\nThe AI agent encountered an error. Please try again later.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
