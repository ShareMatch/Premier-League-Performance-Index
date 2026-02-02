import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuthUser } from "../_shared/require-auth.ts";

interface GcpTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function getAccessToken(): Promise<string> {
  try {
    const res = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } },
    );
    if (res.ok) {
      const data = (await res.json()) as GcpTokenResponse;
      return data.access_token;
    }
  } catch {
    // Metadata server not available
  }

  const serviceAccountJson = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return await getAccessTokenFromServiceAccount(serviceAccount);
  }

  throw new Error("No GCP authentication method available");
}

async function getAccessTokenFromServiceAccount(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const pemKey = serviceAccount.private_key;
  const pemContents = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(signatureInput),
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const jwt = `${signatureInput}.${encodedSignature}`;

  const tokenRes = await fetch(
    serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    },
  );

  if (!tokenRes.ok) {
    throw new Error(`Failed to get access token: ${await tokenRes.text()}`);
  }

  const tokenData = (await tokenRes.json()) as GcpTokenResponse;
  return tokenData.access_token;
}

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

    const { teams, selectedMarket, userQuery, sessionId } = await req.json();

    const missingFields = [];
    if (!teams || teams.length === 0) missingFields.push("teams");
    if (!selectedMarket) missingFields.push("selectedMarket");
    if (!userQuery) missingFields.push("userQuery");

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing field(s): ${missingFields.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const agentStreamUrl = Deno.env.get("VERTEX_AI_AGENT_STREAM_URL");
    const projectId = Deno.env.get("GCP_PROJECT_ID");
    const location = Deno.env.get("GCP_LOCATION") || "us-central1";
    const reasoningEngineId = Deno.env.get("VERTEX_AI_REASONING_ENGINE_ID");

    if (!agentStreamUrl && !reasoningEngineId) {
      return new Response(
        JSON.stringify({ error: "Agent configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await getAccessToken();

    let activeSessionId = sessionId;
    if (!activeSessionId && reasoningEngineId && projectId) {
      console.log("📝 Creating new session...");
      const sessionCreateUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/reasoningEngines/${reasoningEngineId}/sessions`;

      const sessionResponse = await fetch(sessionCreateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: authResult.authUserId }),
      });

      if (sessionResponse.ok) {
        let operation = await sessionResponse.json();
        const operationName = operation.name;
        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const pollResponse = await fetch(
            `https://${location}-aiplatform.googleapis.com/v1beta1/${operationName}`,
            { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!pollResponse.ok) break;
          operation = await pollResponse.json();
        }

        if (operation.response?.name) {
          activeSessionId = operation.response.name.split("/").pop();
          console.log("✅ New session created:", activeSessionId);
        }
      }
    }

    let endpoint = agentStreamUrl;
    if (!endpoint && projectId && reasoningEngineId) {
      endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/reasoningEngines/${reasoningEngineId}:streamQuery?alt=sse`;
    }

    const messageWithContext = `[Selected Market Index: ${selectedMarket}]\n${userQuery}`;

    const payload = {
      class_method: "async_stream_query",
      input: {
        user_id: authResult.authUserId,
        ...(activeSessionId && { session_id: activeSessionId }),
        message: messageWithContext,
      },
    };

    console.log("🤖 Calling Vertex AI Agent:", endpoint);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent request failed: ${response.status} - ${errorText}`);
    }

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    };

    if (activeSessionId) {
      responseHeaders["X-Session-Id"] = activeSessionId;
    }

    // Use TransformStream for cleaner processing
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body?.getReader();

    if (!reader) throw new Error("No response body from agent");

    (async () => {
      try {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            await processLine(line, writer, encoder);
          }
        }

        if (buffer.trim()) {
          await processLine(buffer, writer, encoder);
        }
      } catch (err) {
        console.error("❌ Stream error:", err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error:", errorMessage);
    return new Response(
      JSON.stringify({
        error: `AI agent error: ${errorMessage}`,
        analysis: "**Unable to Generate Analysis**\n\nThe AI agent encountered an error.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function processLine(line: string, writer: any, encoder: TextEncoder) {
  const trimmedLine = line.trim();
  if (!trimmedLine) return;

  if (trimmedLine.startsWith("data:")) {
    const jsonStr = trimmedLine.replace(/^data:\s*/, "");
    if (jsonStr === "[DONE]") return;

    try {
      const data = JSON.parse(jsonStr);

      let text = "";
      if (data.content?.parts) {
        for (const part of data.content.parts) {
          if (part.text) text += part.text;
        }
      } else if (data.text) {
        text = data.text;
      } else if (typeof data === 'string') {
        text = data;
      }

      if (text) {
        await writer.write(encoder.encode(text));
      }
    } catch {
      // Ignore parse errors for partial chunks
    }
  } else if (trimmedLine.startsWith("{")) {
    try {
      const data = JSON.parse(trimmedLine);
      const text = data.content?.parts?.[0]?.text || data.text;
      if (text) await writer.write(encoder.encode(text));
    } catch {
      // Ignore
    }
  }
}
