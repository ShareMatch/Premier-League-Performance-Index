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

    // Get Groq API key
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      console.error("GROQ_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured", details: "Please set GROQ_API_KEY secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get other keys
    const hfToken = Deno.env.get("HF_TOKEN");
    const chromaApiKey = Deno.env.get("CHROMA_API_KEY");
    const chromaTenant = Deno.env.get("CHROMA_TENANT") || "0c2c7310-6d65-40d7-8924-d9cced8221dc";
    const chromaDatabase = Deno.env.get("CHROMA_DATABASE") || "Prod";
    const chromaCollection = Deno.env.get("CHROMA_COLLECTION") || "sharematch_faq";

    let context = "";

    // Try to get context from Chroma Cloud (but don't fail if it doesn't work)
    if (hfToken && chromaApiKey) {
      try {
        console.log("Generating embedding...");
        
        // Step 1: Generate embedding
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

        if (embeddingResponse.ok) {
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
          } else {
            queryEmbedding = embeddingResult;
          }

          console.log("Querying Chroma Cloud...");
          
          // Step 2: Get collection info first
          const collectionsResponse = await fetch(
            `https://api.trychroma.com/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${chromaCollection}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${chromaApiKey}`,
              },
            }
          );

          if (collectionsResponse.ok) {
            const collectionData = await collectionsResponse.json();
            console.log("Collection found:", collectionData.id);
            
            // Step 3: Query the collection
            const chromaResponse = await fetch(
              `https://api.trychroma.com/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collectionData.id}/query`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${chromaApiKey}`,
                },
                body: JSON.stringify({
                  query_embeddings: [queryEmbedding],
                  n_results: 4,
                  include: ["documents"],
                }),
              }
            );

            if (chromaResponse.ok) {
              const chromaData = await chromaResponse.json();
              const documents = chromaData.documents?.[0] || [];
              context = documents.join("\n\n");
              console.log("Found", documents.length, "documents");
            } else {
              console.error("Chroma query failed:", await chromaResponse.text());
            }
          } else {
            console.error("Collection not found:", await collectionsResponse.text());
          }
        } else {
          console.error("Embedding failed:", await embeddingResponse.text());
        }
      } catch (ragError) {
        console.error("RAG error (continuing without context):", ragError);
      }
    } else {
      console.log("RAG disabled - missing HF_TOKEN or CHROMA_API_KEY");
    }

    // Default context if RAG failed
    if (!context) {
      context = `ShareMatch is a sports trading platform. For specific questions, please contact support@sharematch.com.`;
    }

    console.log("Calling Groq LLM...");

    // Call Groq LLM
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are ShareMatch AI, a helpful assistant for the ShareMatch platform.
Answer questions based on the context provided. Be friendly, professional, and concise.
If you don't know the answer, suggest contacting support@sharematch.com.

Context:
${context}`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI service error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqData = await groqResponse.json();
    const aiMessage = groqData.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    console.log("Success!");

    return new Response(
      JSON.stringify({
        message: aiMessage,
        conversation_id: conversation_id || `conv_${crypto.randomUUID().slice(0, 8)}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An error occurred",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
