import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  message: string;
  conversation_id?: string;
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

    // Get ALL API keys INSIDE the request handler
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const hfToken = Deno.env.get("HF_TOKEN");
    const chromaApiKey = Deno.env.get("CHROMA_API_KEY");
    const chromaTenant = Deno.env.get("CHROMA_TENANT");
    const chromaDatabase = Deno.env.get("CHROMA_DATABASE") || "Prod";
    const chromaCollection = Deno.env.get("CHROMA_COLLECTION") || "sharematch_faq";

    // Debug logging
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

    // Step 1: Generate embedding using HuggingFace
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

    // Step 2: Query Chroma Cloud via REST API
    console.log("Step 2: Querying Chroma Cloud...");
    
    let context = "";
    
    // Chroma Cloud REST API headers
    // Try multiple auth formats to find which one works
    const chromaHeaders = {
      "Content-Type": "application/json",
      "X-Chroma-Token": chromaApiKey,  // Primary auth method
    };
    
    console.log("Using API key (first 10 chars):", chromaApiKey?.substring(0, 10) + "...");
    
    try {
      // Get collection ID first
      const collectionUrl = `https://api.trychroma.com/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${chromaCollection}`;
      console.log("Fetching collection from:", collectionUrl);
      
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
          include: ["documents"],
        }),
      });

      if (!queryResponse.ok) {
        const errText = await queryResponse.text();
        console.error("✗ Query error:", queryResponse.status, errText);
        throw new Error(`Query failed: ${errText}`);
      }
      
      const queryData = await queryResponse.json();
      const documents = queryData.documents?.[0] || [];
      context = documents.join("\n\n");
      console.log("✓ Found", documents.length, "documents");
      console.log("Context preview:", context.substring(0, 300));
      
    } catch (chromaError) {
      console.error("Chroma error:", chromaError);
      context = "";
    }
    
    // Default context if no results
    if (!context) {
      console.log("⚠ No context found, using default");
      context = "No specific information found in the knowledge base.";
    }

    // Step 3: Call Groq LLM with context
    console.log("Step 3: Calling Groq LLM...");
    
    const systemPrompt = `You are ShareMatch AI, the official assistant for the ShareMatch platform.

STRICT RULES:
1. Answer ONLY using the CONTEXT below. Do NOT make up information.
2. If the answer is not in the context, say: "I don't have that specific information. Please contact support@sharematch.com"
3. Be concise and accurate.
4. Use exact terms from the context.

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

    // Generate conversation ID if not provided
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
