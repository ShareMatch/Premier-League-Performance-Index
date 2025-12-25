"""
Chroma Cloud Integration for ShareMatch AI Chatbot

This module handles connection to Chroma Cloud for production vector storage.
Uses direct REST API calls (no SDK dependency issues).
"""

import os
import time
import requests
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

# API base URL
CHROMA_API_BASE = "https://api.trychroma.com/api/v2"


def get_headers():
    """Get headers for Chroma Cloud API"""
    if not CHROMA_API_KEY:
        raise ValueError("CHROMA_API_KEY environment variable is required")
    return {
        "Content-Type": "application/json",
        "X-Chroma-Token": CHROMA_API_KEY,
    }


def get_collection_id():
    """Get the collection ID from Chroma Cloud"""
    url = f"{CHROMA_API_BASE}/tenants/{CHROMA_TENANT}/databases/{CHROMA_DATABASE}/collections/{CHROMA_COLLECTION}"
    
    response = requests.get(url, headers=get_headers())
    
    if response.status_code == 404:
        return None
    
    if not response.ok:
        raise Exception(f"Failed to get collection: {response.status_code} - {response.text}")
    
    data = response.json()
    return data.get("id")


def create_collection():
    """Create the collection in Chroma Cloud"""
    url = f"{CHROMA_API_BASE}/tenants/{CHROMA_TENANT}/databases/{CHROMA_DATABASE}/collections"
    
    payload = {
        "name": CHROMA_COLLECTION,
        "metadata": {"description": "ShareMatch FAQ embeddings"}
    }
    
    response = requests.post(url, headers=get_headers(), json=payload)
    
    if not response.ok:
        raise Exception(f"Failed to create collection: {response.status_code} - {response.text}")
    
    data = response.json()
    return data.get("id")


def get_or_create_collection():
    """Get or create the collection, returns collection ID"""
    collection_id = get_collection_id()
    
    if collection_id:
        return collection_id
    
    print(f"   📦 Creating collection: {CHROMA_COLLECTION}")
    return create_collection()


def add_documents(
    documents: List[str],
    embeddings: List[List[float]],
    metadatas: Optional[List[dict]] = None,
    ids: Optional[List[str]] = None
):
    """Add documents with embeddings to Chroma Cloud"""
    collection_id = get_or_create_collection()
    
    # Generate IDs if not provided
    if ids is None:
        ids = [f"doc_{i}" for i in range(len(documents))]
    
    url = f"{CHROMA_API_BASE}/tenants/{CHROMA_TENANT}/databases/{CHROMA_DATABASE}/collections/{collection_id}/add"
    
    payload = {
        "ids": ids,
        "documents": documents,
        "embeddings": embeddings,
        "metadatas": metadatas or [{}] * len(documents),
    }
    
    response = requests.post(url, headers=get_headers(), json=payload)
    
    if not response.ok:
        raise Exception(f"Failed to add documents: {response.status_code} - {response.text}")
    
    return len(documents)


def query_similar(
    query_embedding: List[float],
    n_results: int = 4
) -> dict:
    """Query similar documents from Chroma Cloud"""
    collection_id = get_or_create_collection()
    
    url = f"{CHROMA_API_BASE}/tenants/{CHROMA_TENANT}/databases/{CHROMA_DATABASE}/collections/{collection_id}/query"
    
    payload = {
        "query_embeddings": [query_embedding],
        "n_results": n_results,
        "include": ["documents", "metadatas", "distances"]
    }
    
    response = requests.post(url, headers=get_headers(), json=payload)
    
    if not response.ok:
        raise Exception(f"Failed to query: {response.status_code} - {response.text}")
    
    return response.json()


def clear_collection():
    """Clear all documents from the collection"""
    collection_id = get_collection_id()
    
    if not collection_id:
        print(f"   ℹ️ Collection doesn't exist yet, nothing to clear")
        return
    
    # Get all document IDs
    url = f"{CHROMA_API_BASE}/tenants/{CHROMA_TENANT}/databases/{CHROMA_DATABASE}/collections/{collection_id}/get"
    
    response = requests.post(url, headers=get_headers(), json={"include": []})
    
    if not response.ok:
        print(f"   ⚠️ Could not get documents: {response.status_code}")
        return
    
    data = response.json()
    ids = data.get("ids", [])
    
    if not ids:
        print(f"   ℹ️ Collection is already empty")
        return
    
    # Delete all documents
    delete_url = f"{CHROMA_API_BASE}/tenants/{CHROMA_TENANT}/databases/{CHROMA_DATABASE}/collections/{collection_id}/delete"
    
    delete_response = requests.post(delete_url, headers=get_headers(), json={"ids": ids})
    
    if delete_response.ok:
        print(f"   🗑️ Deleted {len(ids)} documents from collection")
    else:
        print(f"   ⚠️ Delete failed: {delete_response.status_code} - {delete_response.text}")


def get_collection_count() -> int:
    """Get the number of documents in the collection"""
    try:
        collection_id = get_collection_id()
        
        if not collection_id:
            return 0
        
        url = f"{CHROMA_API_BASE}/tenants/{CHROMA_TENANT}/databases/{CHROMA_DATABASE}/collections/{collection_id}/count"
        
        response = requests.get(url, headers=get_headers())
        
        if response.ok:
            return response.json()
        return 0
    except Exception as e:
        print(f"   ⚠️ Could not get count: {e}")
        return 0
