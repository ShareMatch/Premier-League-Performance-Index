"""
Seed embeddings from FAQ PDF to Supabase pgvector

Run this ONCE to populate your Supabase database with embeddings.
After running, your Supabase Edge Function can use these embeddings.

Usage:
    python seed_to_supabase.py

Requirements:
    - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
    - FAQ PDF in ../data/faq.pdf
"""

import os
import sys
import time
import requests
from typing import List

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from loader import load_and_split_documents
from config import EMBEDDING_MODEL
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")  # Optional, for higher rate limits

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    print("Add these to your components/chatbot/.env file")
    sys.exit(1)


def generate_embedding(text: str) -> List[float]:
    """Generate embedding using HuggingFace Inference API (free)"""
    headers = {"Content-Type": "application/json"}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    
    response = requests.post(
        f"https://api-inference.huggingface.co/pipeline/feature-extraction/{EMBEDDING_MODEL}",
        headers=headers,
        json={"inputs": text, "options": {"wait_for_model": True}}
    )
    
    if response.status_code != 200:
        raise Exception(f"Embedding API error: {response.text}")
    
    return response.json()


def insert_to_supabase(content: str, embedding: List[float], metadata: dict = None):
    """Insert embedding into Supabase"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    data = {
        "content": content,
        "embedding": embedding,
        "metadata": metadata or {}
    }
    
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/chatbot_embeddings",
        headers=headers,
        json=data
    )
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Supabase insert error: {response.text}")


def clear_existing_embeddings():
    """Clear existing embeddings before re-seeding"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    
    response = requests.delete(
        f"{SUPABASE_URL}/rest/v1/chatbot_embeddings?id=gt.0",
        headers=headers
    )
    
    if response.status_code not in [200, 204]:
        print(f"⚠️ Warning: Could not clear existing embeddings: {response.text}")


def main():
    print("🚀 Seeding FAQ embeddings to Supabase...")
    print(f"   Supabase URL: {SUPABASE_URL}")
    
    # Load and split documents
    print("\n📄 Loading FAQ PDF...")
    chunks = load_and_split_documents()
    print(f"   Found {len(chunks)} chunks")
    
    # Clear existing embeddings
    print("\n🗑️ Clearing existing embeddings...")
    clear_existing_embeddings()
    
    # Process each chunk
    print("\n🧬 Generating embeddings and uploading...")
    success_count = 0
    
    for i, chunk in enumerate(chunks):
        try:
            content = chunk.page_content
            print(f"   [{i+1}/{len(chunks)}] Processing: {content[:50]}...")
            
            # Generate embedding
            embedding = generate_embedding(content)
            
            # Insert to Supabase
            insert_to_supabase(
                content=content,
                embedding=embedding,
                metadata={
                    "source": "faq.pdf",
                    "page": chunk.metadata.get("page", 0),
                    "chunk_index": i
                }
            )
            
            success_count += 1
            
            # Rate limiting for HuggingFace free tier
            time.sleep(0.5)
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            continue
    
    print(f"\n✅ Done! Successfully uploaded {success_count}/{len(chunks)} embeddings to Supabase")
    print("\nNext steps:")
    print("1. Deploy the chatbot edge function: supabase functions deploy chatbot")
    print("2. Set GROQ_API_KEY in Supabase secrets: supabase secrets set GROQ_API_KEY=xxx")
    print("3. Update your frontend to call the Supabase function")


if __name__ == "__main__":
    main()
