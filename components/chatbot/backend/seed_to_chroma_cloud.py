"""
Seed embeddings from FAQ PDF and Video tutorials to Chroma Cloud

Run this ONCE to populate your Chroma Cloud database with embeddings.
Uses HuggingFace Inference API (cloud-based, no local model needed).

Usage:
    python seed_to_chroma_cloud.py

Requirements:
    - CHROMA_API_KEY in .env
    - HF_TOKEN in .env (get from https://huggingface.co/settings/tokens)
    - FAQ PDF in ../data/faq.pdf
    - Videos JSON in ../data/videos.json
"""

import os
import sys
import time
import json
import requests
from typing import List

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from loader import load_and_split_documents
from config import EMBEDDING_MODEL, VIDEOS_PATH
from chroma_cloud import add_documents, clear_collection, get_collection_count
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Check for required env vars
CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")

if not CHROMA_API_KEY:
    print("❌ Missing CHROMA_API_KEY in .env")
    print("Add this to your components/chatbot/.env file")
    sys.exit(1)

if not HF_TOKEN:
    print("❌ Missing HF_TOKEN in .env")
    print("Get your token from: https://huggingface.co/settings/tokens")
    print("Add HF_TOKEN=hf_xxxxx to your components/chatbot/.env file")
    sys.exit(1)


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding using HuggingFace Inference Providers API
    Uses sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
    New endpoint: router.huggingface.co
    """
    # New HuggingFace router endpoint (as of 2025)
    # Format: /hf-inference/models/{model_id}/pipeline/feature-extraction
    api_url = f"https://router.huggingface.co/hf-inference/models/{EMBEDDING_MODEL}/pipeline/feature-extraction"
    
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Request with options for proper embedding output
    payload = {
        "inputs": text,
        "options": {
            "wait_for_model": True,
            "use_cache": True
        }
    }
    
    response = requests.post(api_url, headers=headers, json=payload)
    
    if response.status_code == 503:
        # Model is loading, wait and retry
        print("      ⏳ Model loading, waiting...")
        time.sleep(20)
        response = requests.post(api_url, headers=headers, json=payload)
    
    if response.status_code != 200:
        raise Exception(f"HuggingFace API error ({response.status_code}): {response.text}")
    
    result = response.json()
    
    # Handle different response formats
    if isinstance(result, list):
        if isinstance(result[0], list):
            # Nested list - take mean pooling
            import numpy as np
            embedding = np.mean(result, axis=0).tolist()
        else:
            # Already a flat embedding
            embedding = result
    else:
        raise Exception(f"Unexpected response format: {type(result)}")
    
    return embedding


def load_video_documents():
    """
    Load video tutorial documents from videos.json
    Returns list of dicts with content and metadata
    """
    if not VIDEOS_PATH.exists():
        print(f"   ⚠️ Videos file not found: {VIDEOS_PATH}")
        return []
    
    with open(VIDEOS_PATH, 'r', encoding='utf-8') as f:
        videos = json.load(f)
    
    return videos


def main():
    print("🚀 Seeding FAQ + Video embeddings to Chroma Cloud...")
    print(f"   Using model: {EMBEDDING_MODEL}")
    print(f"   Using HuggingFace Inference API (cloud)")
    
    # Load and split PDF documents
    print("\n📄 Loading FAQ PDF...")
    chunks = load_and_split_documents()
    print(f"   Found {len(chunks)} PDF chunks")
    
    # Load video documents
    print("\n🎬 Loading Video tutorials...")
    videos = load_video_documents()
    print(f"   Found {len(videos)} video documents")
    
    # Clear existing embeddings
    print("\n🗑️ Clearing existing embeddings...")
    clear_collection()
    
    # Prepare batch data
    print("\n🧬 Generating embeddings via HuggingFace Inference API...")
    documents = []
    embeddings = []
    metadatas = []
    ids = []
    
    total_items = len(chunks) + len(videos)
    current_item = 0
    
    # Process PDF chunks
    for i, chunk in enumerate(chunks):
        current_item += 1
        try:
            content = chunk.page_content
            print(f"   [{current_item}/{total_items}] PDF: {content[:50]}...")
            
            # Generate embedding using HF Inference API
            embedding = generate_embedding(content)
            
            documents.append(content)
            embeddings.append(embedding)
            metadatas.append({
                "source": "faq.pdf",
                "type": "text",
                "page": chunk.metadata.get("page", 0),
                "chunk_index": i
            })
            ids.append(f"faq_chunk_{i}")
            
            # Rate limiting for HuggingFace free tier (avoid 429 errors)
            time.sleep(0.5)
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            continue
    
    # Process video documents
    for video in videos:
        current_item += 1
        try:
            content = video["content"]
            print(f"   [{current_item}/{total_items}] Video: {video['title'][:40]}...")
            
            # Generate embedding using HF Inference API
            embedding = generate_embedding(content)
            
            documents.append(content)
            embeddings.append(embedding)
            metadatas.append({
                "source": "videos.json",
                "type": "video",
                "video_id": video["id"],
                "r2_file_name": video.get("r2_file_name", ""),
                "video_title": video["title"]
            })
            ids.append(f"video_{video['id']}")
            
            # Rate limiting for HuggingFace free tier (avoid 429 errors)
            time.sleep(0.5)
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            continue
    
    if not documents:
        print("\n❌ No documents were processed successfully!")
        sys.exit(1)
    
    # Upload batch to Chroma Cloud
    print(f"\n☁️ Uploading {len(documents)} documents to Chroma Cloud...")
    try:
        count = add_documents(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        print(f"   ✅ Uploaded {count} documents")
    except Exception as e:
        print(f"   ❌ Upload error: {e}")
        sys.exit(1)
    
    # Verify
    final_count = get_collection_count()
    print(f"\n✅ Done! Chroma Cloud now has {final_count} documents")
    
    print("\n" + "="*60)
    print("Next steps for production:")
    print("="*60)
    print("1. Deploy the chatbot edge function:")
    print("   supabase functions deploy chatbot")
    print("")
    print("2. Set secrets in Supabase:")
    print("   supabase secrets set GROQ_API_KEY=your_key")
    print("   supabase secrets set CHROMA_API_KEY=your_key")
    print("   supabase secrets set HF_TOKEN=your_token")
    print("   supabase secrets set CHROMA_TENANT=your_tenant")
    print("   supabase secrets set CHROMA_DATABASE=Prod")


if __name__ == "__main__":
    main()
