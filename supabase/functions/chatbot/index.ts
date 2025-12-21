import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  message: string;
  conversation_id?: string;
}

// Video metadata mapping
const VIDEO_METADATA: {
  [key: string]: {
    url: string;
    title: string;
    intro: string;
  };
} = {
  login: {
    url: "https://embed.app.guidde.com/playbooks/cSwQxFSnf4efCA6UrQyoDt?mode=videoOnly",
    title: "How to Login to ShareMatch",
    intro: "Here's a quick video walkthrough showing you how to log in to ShareMatch!",
  },
  signup: {
    url: "https://embed.app.guidde.com/playbooks/cx22MbGZG6VH96ndhsZpWs?mode=videoOnly",
    title: "How to Sign Up for ShareMatch",
    intro: "I've got a helpful video that will guide you through the signup process step by step.",
  },
  kyc: {
    url: "https://embed.app.guidde.com/playbooks/9d9K7U5U5jVdTuUZgw5S95?mode=videoOnly",
    title: "How to Complete KYC Verification on ShareMatch",
    intro: "Check out this video tutorial on completing your KYC verification - it covers everything you need to know!",
  },
};

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
2. If yes, which topic: login, signup, or kyc (identity verification)?

TUTORIAL indicators: "how do I", "how to", "show me", "guide me", "walk me through", "steps to", "process for"
INFORMATION indicators: "what is", "explain", "tell me about", "describe", "why", "when"

Respond with ONLY valid JSON (no markdown, no explanation):
{"wantsVideo": true/false, "videoTopic": "login"|"signup"|"kyc"|null}

Examples:
- "how do I sign up?" → {"wantsVideo": true, "videoTopic": "signup"}
- "what is the signup flow?" → {"wantsVideo": false, "videoTopic": null}
- "show me how to login" → {"wantsVideo": true, "videoTopic": "login"}
- "what is ShareMatch?" → {"wantsVideo": false, "videoTopic": null}
- "how to verify my identity" → {"wantsVideo": true, "videoTopic": "kyc"}
- "explain the KYC process" → {"wantsVideo": false, "videoTopic": null}

User question: "${query}"`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "user", content: classificationPrompt }
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    });

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
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API keys
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const hfToken = Deno.env.get("HF_TOKEN");
    const chromaApiKey = Deno.env.get("CHROMA_API_KEY");
    const chromaTenant = Deno.env.get("CHROMA_TENANT");
    const chromaDatabase = Deno.env.get("CHROMA_DATABASE") || "Prod";
    const chromaCollection = Deno.env.get("CHROMA_COLLECTION") || "sharematch_faq";

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
    console.log(`🧠 Intent: wantsVideo=${intent.wantsVideo}, topic=${intent.videoTopic}`);
    
    // If user wants a video tutorial, return it immediately
    if (intent.wantsVideo && intent.videoTopic) {
      const videoInfo = VIDEO_METADATA[intent.videoTopic];
      if (videoInfo) {
        console.log(`🎬 Returning video tutorial: ${intent.videoTopic}`);
        const convId = conversation_id || `conv_${crypto.randomUUID().slice(0, 8)}`;
        
        return new Response(
          JSON.stringify({
            message: videoInfo.intro,
            conversation_id: convId,
            video: {
              id: intent.videoTopic,
              url: videoInfo.url,
              title: videoInfo.title,
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
          "Authorization": `Bearer ${hfToken}`,
        },
        body: JSON.stringify({ 
          inputs: message,
          options: { wait_for_model: true }
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
      queryEmbedding = queryEmbedding.map(v => v / numTokens);
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
      
      // Query the collection
      const queryUrl = `https://api.trychroma.com/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collectionData.id}/query`;
      
      const queryResponse = await fetch(queryUrl, {
        method: "POST",
        headers: chromaHeaders,
        body: JSON.stringify({
          query_embeddings: [queryEmbedding],
          n_results: 4,
        include: ["documents"], // Only need documents for RAG context
        }),
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
    
    const context = documents.join("\n\n") || "No specific information found in the knowledge base.";
    
    // Call Groq LLM
    const systemPrompt = `You are ShareMatch AI, the official assistant for the ShareMatch platform.

COMMUNICATION STYLE:
- Speak naturally and directly, as if you inherently know this information
- Answer confidently as the authoritative source on ShareMatch
- Be conversational but professional

HANDLING UNCLEAR QUESTIONS (CRITICAL):
- If the user sends a vague message like "huh?", "what?", "again?", "??", or similar:
  → Ask them to clarify: "Could you please rephrase your question? I'm happy to help!"
- If the user asks you to repeat something:
  → Politely ask what specific part they'd like explained: "Which part would you like me to explain further?"
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

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq error:", errorText);
      throw new Error("Failed to get AI response");
    }

    const groqData = await groqResponse.json();
    const aiMessage = groqData.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

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
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
