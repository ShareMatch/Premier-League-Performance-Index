import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { restrictedCors } from "../_shared/cors.ts";
import {
  VIDEO_FILE_NAMES,
  VIDEO_METADATA,
  INTENT_CLASSIFICATION_PROMPT,
  CHATBOT_PUBLIC_PROMPT,
  CHATBOT_AUTHENTICATED_PROMPT,
} from "../_shared/prompts/index.ts";
import { interpolate } from "../_shared/prompts/utils.ts";

interface ChatRequest {
  message: string;
  conversation_id?: string;
}

// Supabase configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

// R2 Configuration
const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID") || "";
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID") || "";
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "sharematch-assets";

// ============== R2 Signed URL Generation ==============

async function hmacSha256(
  key: ArrayBuffer | Uint8Array,
  message: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

async function generateSignedUrl(
  objectKey: string,
  expiresInSeconds: number = 604800 // 7 days
): Promise<string> {
  const region = "auto";
  const service = "s3";
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;

  const now = new Date();
  const amzDate =
    now
      .toISOString()
      .replace(/[:-]|\.\d{3}/g, "")
      .slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const method = "GET";
  const canonicalUri = `/${R2_BUCKET_NAME}/${encodeURIComponent(
    objectKey
  ).replace(/%2F/g, "/")}`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": expiresInSeconds.toString(),
    "X-Amz-SignedHeaders": signedHeaders,
  });

  const canonicalRequest = [
    method,
    canonicalUri,
    queryParams.toString(),
    `host:${host}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(
    R2_SECRET_ACCESS_KEY,
    dateStamp,
    region,
    service
  );
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  queryParams.set("X-Amz-Signature", signature);
  return `${endpoint}${canonicalUri}?${queryParams.toString()}`;
}

// ============== End R2 Signed URL Generation ==============

/**
 * Classify user intent using LLM
 * Returns: { wantsVideo: boolean, videoTopic: string | null }
 */
async function classifyIntent(
  query: string,
  groqApiKey: string
): Promise<{ wantsVideo: boolean; videoTopic: string | null }> {
  // Use shared prompt with interpolation
  const classificationPrompt = interpolate(INTENT_CLASSIFICATION_PROMPT, { query });

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: classificationPrompt }],
          temperature: 0,
          max_tokens: 100,
        }),
      }
    );

    if (!response.ok) {
      console.error("Intent classification failed, defaulting to no video");
      return { wantsVideo: false, videoTopic: null };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || "";

    console.log(`🧠 Intent classification raw response: ${content}`);

    // Parse JSON response
    const parsed = JSON.parse(content);
    return {
      wantsVideo: parsed.wantsVideo === true,
      videoTopic: parsed.videoTopic || null,
    };
  } catch (error) {
    console.error("Intent classification error:", error);
    return { wantsVideo: false, videoTopic: null };
  }
}

serve(async (req) => {
  const corsHeaders = restrictedCors(req.headers.get('origin'));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, conversation_id }: ChatRequest = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============== Session Validation ==============
    let isAuthenticated = false;
    let userId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (
      authHeader?.startsWith("Bearer ") &&
      SUPABASE_URL &&
      SUPABASE_ANON_KEY
    ) {
      try {
        const token = authHeader.substring(7);
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: {
            headers: { Authorization: `Bearer ${token}` },
          },
        });

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (!error && user) {
          isAuthenticated = true;
          userId = user.id;
          console.log(`🔐 User authenticated: ${userId}`);
        }
      } catch (authError) {
        console.log("🔓 Auth validation failed, using public mode:", authError);
      }
    } else {
      console.log("🔓 No auth token provided, using public mode");
    }
    // ============== End Session Validation ==============

    // Get API keys
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const hfToken = Deno.env.get("HF_TOKEN");
    const chromaApiKey = Deno.env.get("CHROMA_API_KEY");
    const chromaTenant = Deno.env.get("CHROMA_TENANT");
    const chromaDatabase = Deno.env.get("CHROMA_DATABASE") || "Prod";
    const chromaCollection =
      Deno.env.get("CHROMA_COLLECTION") || "sharematch_faq";

    console.log("=== CONFIG CHECK ===");
    console.log("GROQ_API_KEY:", groqApiKey ? "✓ SET" : "✗ MISSING");
    console.log("HF_TOKEN:", hfToken ? "✓ SET" : "✗ MISSING");
    console.log("CHROMA_API_KEY:", chromaApiKey ? "✓ SET" : "✗ MISSING");
    console.log("CHROMA_TENANT:", chromaTenant || "✗ MISSING");
    console.log("CHROMA_DATABASE:", chromaDatabase);
    console.log("CHROMA_COLLECTION:", chromaCollection);
    console.log("====================");

    if (!groqApiKey) throw new Error("GROQ_API_KEY not configured");
    if (!hfToken) throw new Error("HF_TOKEN not configured");
    if (!chromaApiKey) throw new Error("CHROMA_API_KEY not configured");
    if (!chromaTenant) throw new Error("CHROMA_TENANT not configured");

    // Step 0: Intent Classification using LLM
    console.log("Step 0: Classifying user intent...");
    const intent = await classifyIntent(message, groqApiKey);
    console.log(
      `🧠 Intent: wantsVideo=${intent.wantsVideo}, topic=${intent.videoTopic}`
    );

    // If user wants a video tutorial, return it immediately
    if (intent.wantsVideo && intent.videoTopic) {
      const videoInfo = VIDEO_METADATA[intent.videoTopic];
      const videoFileName = VIDEO_FILE_NAMES[intent.videoTopic];

      if (videoInfo && videoFileName) {
        // Check access level for authenticated-only videos
        if (videoInfo.accessLevel === "authenticated" && !isAuthenticated) {
          console.log(`🚫 Video ${intent.videoTopic} requires authentication`);
          const convId =
            conversation_id || `conv_${crypto.randomUUID().slice(0, 8)}`;
          return new Response(
            JSON.stringify({
              message:
                "To access this tutorial, please log in to your ShareMatch account first. I can help you with login or signup if you need!",
              conversation_id: convId,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`🎬 Returning video tutorial: ${intent.videoTopic}`);
        const convId =
          conversation_id || `conv_${crypto.randomUUID().slice(0, 8)}`;

        // Generate signed URL for R2 video
        let videoUrl = "";
        try {
          if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
            videoUrl = await generateSignedUrl(videoFileName, 604800); // 7 days
            console.log(`✅ Generated signed URL for ${videoFileName}`);
          } else {
            console.warn(
              "⚠️ R2 credentials not configured, video URL will be empty"
            );
          }
        } catch (error) {
          console.error("❌ Failed to generate signed URL:", error);
        }

        return new Response(
          JSON.stringify({
            message: videoInfo.intro,
            conversation_id: convId,
            video: {
              id: intent.videoTopic,
              url: videoUrl,
              title: videoInfo.title,
              isR2Video: true,
            },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("📝 User wants information, proceeding with RAG...");

    // Step 1: Generate embedding
    console.log("Step 1: Generating embedding...");

    const embeddingResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hfToken}`,
        },
        body: JSON.stringify({
          inputs: message,
          options: { wait_for_model: true },
        }),
      }
    );

    if (!embeddingResponse.ok) {
      const errText = await embeddingResponse.text();
      console.error("Embedding error:", errText);
      throw new Error("Failed to generate embedding");
    }

    const embeddingResult = await embeddingResponse.json();

    // Mean pooling for nested arrays
    let queryEmbedding: number[];
    if (Array.isArray(embeddingResult) && Array.isArray(embeddingResult[0])) {
      const numTokens = embeddingResult.length;
      const embeddingDim = embeddingResult[0].length;
      queryEmbedding = new Array(embeddingDim).fill(0);
      for (let i = 0; i < numTokens; i++) {
        for (let j = 0; j < embeddingDim; j++) {
          queryEmbedding[j] += embeddingResult[i][j];
        }
      }
      queryEmbedding = queryEmbedding.map((v) => v / numTokens);
    } else if (Array.isArray(embeddingResult)) {
      queryEmbedding = embeddingResult;
    } else {
      throw new Error("Unexpected embedding format");
    }

    console.log("✓ Embedding generated, dimension:", queryEmbedding.length);

    // Step 2: Query Chroma Cloud
    console.log("Step 2: Querying Chroma Cloud...");

    const chromaHeaders = {
      "Content-Type": "application/json",
      "X-Chroma-Token": chromaApiKey,
    };

    // Get collection ID
    const collectionUrl = `https://api.trychroma.com/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${chromaCollection}`;

    const collectionsResponse = await fetch(collectionUrl, {
      method: "GET",
      headers: chromaHeaders,
    });

    if (!collectionsResponse.ok) {
      const errText = await collectionsResponse.text();
      console.error("✗ Collection error:", collectionsResponse.status, errText);
      throw new Error(`Collection not found: ${errText}`);
    }

    const collectionData = await collectionsResponse.json();
    console.log("✓ Collection found, ID:", collectionData.id);

    // Query the collection with access level filtering
    const queryUrl = `https://api.trychroma.com/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collectionData.id}/query`;

    // Build query body with optional access_level filter for unauthenticated users
    const queryBody: {
      query_embeddings: number[][];
      n_results: number;
      include: string[];
      where?: { access_level: { $eq: string } };
    } = {
      query_embeddings: [queryEmbedding],
      n_results: 4,
      include: ["documents"],
    };

    // Filter to only public documents for unauthenticated users
    if (!isAuthenticated) {
      queryBody.where = { access_level: { $eq: "public" } };
      console.log("🔓 Filtering RAG to public documents only");
    } else {
      console.log("🔐 RAG has access to all documents");
    }

    const queryResponse = await fetch(queryUrl, {
      method: "POST",
      headers: chromaHeaders,
      body: JSON.stringify(queryBody),
    });

    if (!queryResponse.ok) {
      const errText = await queryResponse.text();
      console.error("✗ Query error:", queryResponse.status, errText);
      throw new Error(`Query failed: ${errText}`);
    }

    const queryData = await queryResponse.json();
    const documents = queryData.documents?.[0] || [];

    console.log("✓ Found", documents.length, "documents");

    // Step 3: Generate response using RAG
    console.log("Step 3: Generating RAG response...");

    const context =
      documents.join("\n\n") ||
      "No specific information found in the knowledge base.";

    // Use shared prompts with interpolation
    const systemPrompt = isAuthenticated
      ? interpolate(CHATBOT_AUTHENTICATED_PROMPT, { context })
      : interpolate(CHATBOT_PUBLIC_PROMPT, { context });
    
    console.log(
      `📝 Using ${isAuthenticated ? "authenticated" : "public"} system prompt`
    );

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.1,
          max_tokens: 512,
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq error:", errorText);
      throw new Error("Failed to get AI response");
    }

    const groqData = await groqResponse.json();
    const aiMessage =
      groqData.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response.";

    const convId = conversation_id || `conv_${crypto.randomUUID().slice(0, 8)}`;

    return new Response(
      JSON.stringify({
        message: aiMessage,
        conversation_id: convId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred processing your message",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
