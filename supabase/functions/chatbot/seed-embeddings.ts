/**
 * Script to seed embeddings from FAQ PDF into Supabase
 * 
 * Run this locally once to populate your database:
 * npx ts-node seed-embeddings.ts
 * 
 * Or use the Python version in the backend folder for more control
 */

import { createClient } from "@supabase/supabase-js";

// You'll need to run this with your actual values
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HF_TOKEN = process.env.HF_TOKEN; // Optional

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Your FAQ content chunks - extract these from your PDF
// You can use the Python loader.py script to extract and split the PDF
const FAQ_CHUNKS = [
  // Example chunks - replace with your actual FAQ content
  "ShareMatch is a sports trading platform that allows users to buy and sell tokens representing sports teams...",
  "To create an account, click Sign Up and provide your email, phone number, and complete the KYC verification...",
  // Add more chunks from your FAQ
];

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-mpnet-base-v2",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(HF_TOKEN && { Authorization: `Bearer ${HF_TOKEN}` }),
      },
      body: JSON.stringify({ inputs: text }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${await response.text()}`);
  }

  return response.json();
}

async function seedEmbeddings() {
  console.log("🚀 Starting to seed embeddings...");

  for (const chunk of FAQ_CHUNKS) {
    try {
      console.log(`Processing: ${chunk.substring(0, 50)}...`);
      
      const embedding = await generateEmbedding(chunk);
      
      const { error } = await supabase.from("chatbot_embeddings").insert({
        content: chunk,
        embedding: embedding,
        metadata: { source: "faq.pdf" },
      });

      if (error) {
        console.error("Insert error:", error);
      } else {
        console.log("✅ Inserted successfully");
      }

      // Rate limiting - HuggingFace free tier
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error processing chunk:", error);
    }
  }

  console.log("✅ Done seeding embeddings!");
}

seedEmbeddings();
