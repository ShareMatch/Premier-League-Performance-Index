import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// Map topic IDs to R2 video file names
const VIDEO_FILE_NAMES: Record<string, string> = {
  login: "Streamline Login Process With Sharematch.mp4",
  signup: "Streamline Signup Process With Sharematch Product Demo.mp4",
  kyc: "Streamline KYC Verification With Sharematch Demo.mp4",
  buyAssets: "How to buy.mp4",
  sellAssets: "How to sell.mp4",
  forgotPassword: "forgot password.mp4",
  updateUserDetails: "How to update user details.mp4",
  editMarketingPreferences: "how to edit marketing preferences.mp4",
  changePassword: "how to change password.mp4",
  eplIndex: "English epl.mp4",
  splIndex: "English SPL.mp4",
  uefaIndex: "English UEFA.mp4",
  nflIndex: "English NFL.mp4",
  nbaIndex: "English NBA Market.mp4",
  islIndex: "English Indonesia Super League.mp4",
  t20Index: "English T20 World Cup.mp4",
  fifaIndex: "English FIFA World Cup.mp4",
  f1Index: "English Formula 1.mp4",
};

// Video metadata mapping (without URLs - URLs are generated dynamically)
// accessLevel: "public" = available to all, "authenticated" = requires login
const VIDEO_METADATA: {
  [key: string]: {
    title: string;
    intro: string;
    accessLevel: "public" | "authenticated";
  };
} = {
  login: {
    title: "How to Login to ShareMatch",
    intro:
      "Here's a quick video walkthrough showing you how to log in to ShareMatch!",
    accessLevel: "public",
  },
  signup: {
    title: "How to Sign Up for ShareMatch",
    intro:
      "I've got a helpful video that will guide you through the signup process step by step.",
    accessLevel: "public",
  },
  kyc: {
    title: "How to Complete KYC Verification on ShareMatch",
    intro:
      "Check out this video tutorial on completing your KYC verification - it covers everything you need to know!",
    accessLevel: "public",
  },
  buyAssets: {
    title: "How to Buy Assets on ShareMatch",
    intro:
      "Here's a step-by-step video showing you how to purchase assets on ShareMatch!",
    accessLevel: "authenticated",
  },
  sellAssets: {
    title: "How to Sell Assets on ShareMatch",
    intro:
      "Check out this guide on how to sell your assets on the ShareMatch platform!",
    accessLevel: "authenticated",
  },
  forgotPassword: {
    title: "How to Reset Your Password on ShareMatch",
    intro:
      "Here's a quick video showing you how to reset your password if you've forgotten it!",
    accessLevel: "public",
  },
  updateUserDetails: {
    title: "How to Update User Details on ShareMatch",
    intro:
      "This video will walk you through updating your profile information on ShareMatch!",
    accessLevel: "authenticated",
  },
  editMarketingPreferences: {
    title: "How to Edit Marketing Preferences on ShareMatch",
    intro:
      "Learn how to customize your communication preferences with this helpful video!",
    accessLevel: "authenticated",
  },
  changePassword: {
    title: "How to Change Your Password on ShareMatch",
    intro: "Here's a guide on how to change your password",
    accessLevel: "authenticated",
  },
  eplIndex: {
    title: "Understanding the English Premier League Index on ShareMatch",
    intro:
      "This video explains how the English Premier League index token works on ShareMatch.",
    accessLevel: "authenticated",
  },
  splIndex: {
    title: "Understanding the Saudi Pro League Index on ShareMatch",
    intro:
      "Learn how the Saudi Pro League index token functions on ShareMatch.",
    accessLevel: "authenticated",
  },
  uefaIndex: {
    title: "Understanding the UEFA Champions League Index on ShareMatch",
    intro:
      "This video explains how the UEFA Champions League index token works on ShareMatch.",
    accessLevel: "authenticated",
  },
  nflIndex: {
    title: "Understanding the NFL Index on ShareMatch",
    intro:
      "This video explains how the NFL index token functions on ShareMatch.",
    accessLevel: "authenticated",
  },
  nbaIndex: {
    title: "Understanding the NBA Index on ShareMatch",
    intro:
      "Learn how the NBA index token works and how index values are represented on ShareMatch.",
    accessLevel: "authenticated",
  },
  islIndex: {
    title: "Understanding the Indonesia Super League Index on ShareMatch",
    intro:
      "This video explains how the Indonesia Super League index token functions on ShareMatch.",
    accessLevel: "authenticated",
  },
  t20Index: {
    title: "Understanding the T20 Cricket Index on ShareMatch",
    intro:
      "Learn how the T20 Cricket index token works and how index performance is represented.",
    accessLevel: "authenticated",
  },
  fifaIndex: {
    title: "Understanding the FIFA World Cup Index on ShareMatch",
    intro:
      "This video explains how the FIFA World Cup index token works on ShareMatch.",
    accessLevel: "authenticated",
  },
  f1Index: {
    title: "Understanding the F1 Index on ShareMatch",
    intro:
      "Learn how the F1 index token operates and how index values move on ShareMatch.",
    accessLevel: "authenticated",
  },
};

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
 * Returns: { wantsVideo: boolean, videoTopic: "login" | "signup" | "kyc" | null }
 */
async function classifyIntent(
  query: string,
  groqApiKey: string
): Promise<{ wantsVideo: boolean; videoTopic: string | null }> {
  const classificationPrompt = `You are an intent classifier. Analyze the user's question and determine:
1. Does the user want a step-by-step tutorial/guide (visual walkthrough)?
2. If yes, which topic from this list:
   - login: How to log into ShareMatch
   - signup: How to create a new account
   - kyc: How to verify identity/complete KYC
   - forgotPassword: How to reset/recover password
   - buyAssets: How to purchase/buy assets
   - sellAssets: How to sell assets
   - updateUserDetails: How to update profile/user information
   - editMarketingPreferences: How to change communication/marketing settings
   - changePassword: How to change password (when logged in)
   - eplIndex: English Premier League index overview
   - splIndex: Saudi Pro League index overview
   - uefaIndex: UEFA Champions League index overview
   - nflIndex: NFL index overview
   - nbaIndex: NBA index overview
   - islIndex: Indonesia Super League index overview
   - t20Index: T20 Cricket index overview
   - fifaIndex: FIFA World Cup index overview
   - f1Index: Formula 1 index overview


TUTORIAL indicators: "how do I", "how to", "show me", "guide me", "walk me through", "steps to", "process for", "tutorial"
INFORMATION indicators: "what is", "explain", "tell me about", "describe", "why", "when"

IMPORTANT: 
- "forgot password" or "reset password" → forgotPassword
- "change password" (when logged in) → changePassword
- "how to buy" → buyAssets
- "how to sell" → sellAssets

IMPORTANT (Index Videos):
- If the user asks to explain, show, or understand an index, return wantsVideo=true
- Examples of index intent:
  "what is epl index"
  "explain nba index"
  "how does the fifa index work"
  "show me the f1 index"
- These are EDUCATIONAL index videos, not trading tutorials


Respond with ONLY valid JSON (no markdown, no explanation):
{"wantsVideo": true/false, "videoTopic": "login"|"signup"|"kyc"|"forgotPassword"|"buyAssets"|"sellAssets"|"updateUserDetails"|"editMarketingPreferences"|"changePassword"|"eplIndex"|"splIndex"|"uefaIndex"|"nflIndex"|"nbaIndex"|"islIndex"|"t20Index"|"fifaIndex"|"f1Index"|null}


Examples:
- "how do I sign up?" → {"wantsVideo": true, "videoTopic": "signup"}
- "what is the signup flow?" → {"wantsVideo": false, "videoTopic": null}
- "show me how to login" → {"wantsVideo": true, "videoTopic": "login"}
- "I forgot my password" → {"wantsVideo": true, "videoTopic": "forgotPassword"}
- "how to reset my password" → {"wantsVideo": true, "videoTopic": "forgotPassword"}
- "how do I change my password" → {"wantsVideo": true, "videoTopic": "changePassword"}
- "how to buy assets" → {"wantsVideo": true, "videoTopic": "buyAssets"}
- "show me how to sell" → {"wantsVideo": true, "videoTopic": "sellAssets"}
- "how to update my profile" → {"wantsVideo": true, "videoTopic": "updateUserDetails"}
- "what is ShareMatch?" → {"wantsVideo": false, "videoTopic": null}
- "how to verify my identity" → {"wantsVideo": true, "videoTopic": "kyc"}
- "explain the KYC process" → {"wantsVideo": false, "videoTopic": null}

User question: "${query}"`;

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
          max_tokens: 100, // Increased from 50 to handle longer responses
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
    // Check if user is authenticated by validating the auth token
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
    // Determine if user wants a video tutorial or information
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
              isR2Video: true, // Flag to tell frontend this is an R2 video (use <video> tag)
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

    // Step 3: Generate response using RAG (intent classification already handled video requests)
    console.log("Step 3: Generating RAG response...");

    const context =
      documents.join("\n\n") ||
      "No specific information found in the knowledge base.";

    // ============== Dual System Prompts ==============
    // Different prompts for authenticated vs public users

    const publicSystemPrompt = `You are ShareMatch AI, helping visitors learn about ShareMatch.

COMMUNICATION STYLE:
- Be friendly, welcoming, and helpful
- Speak naturally and directly
- Encourage users to sign up or log in when appropriate

GREETINGS:
When the user says greetings like "hi", "hey", "hello", "good morning", "what's up", etc.:
→ Respond warmly and naturally, welcoming them to ShareMatch
→ Let them know you can help with: signing up, logging in, KYC verification, or learning about ShareMatch
→ Keep it brief and friendly
→ Do NOT ask them to rephrase - greetings are NOT unclear questions!

Example greeting responses:
- "Hey there! 👋 Welcome to ShareMatch! What can I help you with today?"
- "Hello! I'm here to help you with ShareMatch. Feel free to ask about signing up, logging in, or how the platform works!"
- "Hi! Welcome! I can assist you with account creation, login, or any questions about ShareMatch."

TOPICS YOU CAN HELP WITH:
- What is ShareMatch and how it works
- How to create an account (signup process)
- How to login to your account
- KYC verification process
- General platform overview

TOPICS THAT REQUIRE LOGIN:
- Trading and buying/selling tokens
- Deposits and withdrawals
- Account settings and profile management
- Portfolio and transaction history
- Specific account questions

HANDLING LOGIN-REQUIRED TOPICS:
If asked about trading, deposits, withdrawals, or account-specific features, respond:
"To get help with that, please log in to your ShareMatch account first. I can help you with login or signup if you need!"

HANDLING UNCLEAR QUESTIONS:
- ONLY if the user sends truly vague follow-ups like "huh?", "what?", "again?", "??":
  → Ask them to clarify: "Could you please rephrase your question? I'm happy to help!"
- NEVER treat greetings as unclear questions
- NEVER dump raw text or repeat the same long response

STRICT RULES:
1. Answer ONLY using the CONTEXT below. Do NOT make up information.
2. Keep responses concise and focused.
3. If the answer is not in the context, say: "I don't have that specific information. Please contact hello@sharematch.me"
4. NEVER use phrases like "according to the context" or similar.

FORMATTING RULES:
When presenting lists or multiple features:
- Put EACH item on its OWN LINE
- Use bullet points with dashes (-)
- Keep each bullet point concise

CONTEXT:
${context}`;

    const authenticatedSystemPrompt = `You are ShareMatch AI, the official assistant for the ShareMatch platform.

COMMUNICATION STYLE:
- Speak naturally and directly, as if you inherently know this information
- Answer confidently as the authoritative source on ShareMatch
- Be conversational but professional

GREETINGS (CRITICAL):
When the user says greetings like "hi", "hey", "hello", "good morning", "what's up", etc.:
→ Respond warmly: "Hey! Great to see you! How can I help you today? I can assist with trading, deposits, account settings, or anything else about ShareMatch."
→ Do NOT ask them to rephrase - greetings are NOT unclear questions!

HANDLING UNCLEAR QUESTIONS:
- ONLY if the user sends truly vague follow-ups like "huh?", "what?", "again?", "??":
  → Ask them to clarify: "Could you please rephrase your question? I'm happy to help!"
- If the user asks you to repeat something:
  → Politely ask what specific part they'd like explained: "Which part would you like me to explain further?"
- NEVER treat greetings as unclear questions
- NEVER dump raw text or repeat the same long response
- NEVER output raw context chunks or document text

STRICT RULES:
1. Answer ONLY using the CONTEXT below. Do NOT make up information.
2. Keep responses concise and focused on what the user asked.
3. If the answer is not in the context, say: "I don't have that specific information. Please contact hello@sharematch.me"
4. Use exact terms and definitions from the context.
5. NEVER use phrases like "according to the context", "based on the provided information", "from the documents", or "the context states"
6. NEVER output raw document text, chunks, or unformatted context data.

FORMATTING RULES:
When presenting lists or multiple features:
- Put EACH item on its OWN LINE
- Use bullet points with dashes (-)
- Keep each bullet point concise

CONTEXT:
${context}`;

    // Select prompt based on authentication status
    const systemPrompt = isAuthenticated
      ? authenticatedSystemPrompt
      : publicSystemPrompt;
    console.log(
      `📝 Using ${isAuthenticated ? "authenticated" : "public"} system prompt`
    );
    // ============== End Dual System Prompts ==============

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
