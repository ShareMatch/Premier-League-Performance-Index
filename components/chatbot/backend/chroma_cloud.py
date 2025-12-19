"""
Chroma Cloud Integration for ShareMatch AI Chatbot

This module handles connection to Chroma Cloud for production vector storage.
Uses the official Chroma Cloud Python SDK.
"""

import os
import chromadb
from typing import List, Optional
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Chroma Cloud credentials
CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT", "0c2c7310-6d65-40d7-8924-d9cced8221dc")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE", "Prod")
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "sharematch_faq")


def get_chroma_cloud_client():
    """Get Chroma Cloud client using the official SDK"""
    if not CHROMA_API_KEY:
        raise ValueError("CHROMA_API_KEY environment variable is required")
    
    # Use the CloudClient for Chroma Cloud
    client = chromadb.CloudClient(
        api_key=CHROMA_API_KEY,
        tenant=CHROMA_TENANT,
        database=CHROMA_DATABASE
    )
    
    return client


def get_or_create_collection(client=None):
    """Get or create the FAQ collection"""
    if client is None:
        client = get_chroma_cloud_client()
    
    return client.get_or_create_collection(
        name=CHROMA_COLLECTION,
        metadata={"description": "ShareMatch FAQ embeddings"}
    )


def add_documents(
    documents: List[str],
    embeddings: List[List[float]],
    metadatas: Optional[List[dict]] = None,
    ids: Optional[List[str]] = None
):
    """Add documents with embeddings to Chroma Cloud"""
    client = get_chroma_cloud_client()
    collection = get_or_create_collection(client)
    
    # Generate IDs if not provided
    if ids is None:
        ids = [f"doc_{i}" for i in range(len(documents))]
    
    # Add to collection
    collection.add(
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas or [{}] * len(documents),
        ids=ids
    )
    
    return len(documents)


def query_similar(
    query_embedding: List[float],
    n_results: int = 4
) -> dict:
    """Query similar documents from Chroma Cloud"""
    client = get_chroma_cloud_client()
    collection = get_or_create_collection(client)
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )
    
    return results


def clear_collection():
    """Clear all documents from the collection by deleting and recreating"""
    client = get_chroma_cloud_client()
    
    try:
        # Try to delete the collection
        client.delete_collection(CHROMA_COLLECTION)
        print(f"   🗑️ Deleted collection: {CHROMA_COLLECTION}")
    except Exception as e:
        print(f"   ⚠️ Collection might not exist yet: {e}")
    
    # Recreate empty collection
    collection = client.get_or_create_collection(
        name=CHROMA_COLLECTION,
        metadata={"description": "ShareMatch FAQ embeddings"}
    )
    print(f"   ✅ Created fresh collection: {CHROMA_COLLECTION}")
    return collection


def get_collection_count() -> int:
    """Get the number of documents in the collection"""
    try:
        client = get_chroma_cloud_client()
        collection = get_or_create_collection(client)
        return collection.count()
    except Exception as e:
        print(f"   ⚠️ Could not get count: {e}")
        return 0
