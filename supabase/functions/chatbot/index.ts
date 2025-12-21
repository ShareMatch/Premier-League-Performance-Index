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
 * Convert Chroma L2 distance to similarity score
 * For normalized embeddings: similarity ≈ 1 - (distance²/4)
 */
function distanceToSimilarity(distance: number): number {
  return Math.max(0, 1 - (distance * distance / 4));
}

/**
 * Check if a document is a video tutorial based on metadata
 */
function extractVideoType(metadata: any): string | null {
  if (!metadata) return null;
  
  // Check if metadata has 'type' field indicating it's a video
  // The seed script stores the video ID as 'video_id'
  if (metadata.type === "video" && metadata.video_id) {
    return metadata.video_id; // Returns "login", "signup", or "kyc"
  }
  
  return null;
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
        include: ["documents", "metadatas", "distances"], // IMPORTANT: Include distances and metadatas
      }),
    });

    if (!queryResponse.ok) {
      const errText = await queryResponse.text();
      console.error("✗ Query error:", queryResponse.status, errText);
      throw new Error(`Query failed: ${errText}`);
    }
    
    const queryData = await queryResponse.json();
    const documents = queryData.documents?.[0] || [];
    const metadatas = queryData.metadatas?.[0] || [];
    const distances = queryData.distances?.[0] || [];
    
    console.log("✓ Found", documents.length, "documents");

    // Step 3: Check ONLY the TOP result - if it's a video, return it
    // This ensures we only return a video when it's the BEST match
    if (metadatas.length > 0 && distances.length > 0) {
      const topMeta = metadatas[0];
      const topDistance = distances[0];
      const topSimilarity = distanceToSimilarity(topDistance);
      
      console.log(`📊 Top result: type=${topMeta?.type}, video_id=${topMeta?.video_id}, similarity=${(topSimilarity * 100).toFixed(1)}%`);
      
      const videoType = extractVideoType(topMeta);
      
      // Only return video if it's the TOP result AND has good similarity (60%+)
      if (videoType && topSimilarity >= 0.60) {
        console.log(`🎬 Top result is a video: ${videoType} (${(topSimilarity * 100).toFixed(1)}%)`);
        
        const videoInfo = VIDEO_METADATA[videoType];
        const convId = conversation_id || `conv_${crypto.randomUUID().slice(0, 8)}`;
        
        return new Response(
          JSON.stringify({
            message: videoInfo.intro,
            conversation_id: convId,
            video: {
              id: videoType,
              url: videoInfo.url,
              title: videoInfo.title,
            },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        console.log("📝 Top result is not a video or similarity too low, proceeding with text response");
      }
    }

    // Step 4: Normal RAG flow (not a video query or low similarity)
    console.log("Step 4: Processing as regular RAG query...");
    
    const context = documents.join("\n\n") || "No specific information found in the knowledge base.";
    
    // Call Groq LLM
    const systemPrompt = `You are ShareMatch AI, the official assistant for the ShareMatch platform.

COMMUNICATION STYLE:
- Speak naturally and directly, as if you inherently know this information
- Answer confidently as the authoritative source on ShareMatch
- Be conversational but professional

STRICT RULES:
1. Answer ONLY using the CONTEXT below. Do NOT make up information.
2. When the context contains structured information (lists, bullet points, specific features):
   - Include ALL relevant details from the context
   - Maintain the structure (use bullet points/lists when source does)
   - Don't omit important specifics unless the user asks for a brief summary
3. If the answer is not in the context, say: "I don't have that specific information. Please contact hello@sharematch.me"
4. Be thorough but concise - include all key points without unnecessary elaboration.
5. Use exact terms and definitions from the context.
6. NEVER use phrases like "according to the context", "based on the provided information", "from the documents", or "the context states"

FORMATTING RULES (CRITICAL):
When presenting lists or multiple features:
- Put EACH item on its OWN LINE
- Use this exact format:

The token grants:
- First feature: description here
- Second feature: description here

NOT this format:
The token grants: • First feature: description • Second feature: description

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