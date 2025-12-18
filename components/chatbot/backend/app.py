"""
ShareMatch AI Chatbot - FastAPI Backend
RAG-based chatbot using Groq LLM and HuggingFace embeddings
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import sys

# Add the backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from loader import load_and_split_documents
from embeddings import get_vectorstore
from retriever import get_retriever
from model import get_llm
from config import CHROMA_DIR

app = FastAPI(
    title="ShareMatch AI Chatbot",
    description="RAG-based chatbot API for ShareMatch",
    version="1.0.0"
)

# CORS middleware to allow frontend requests
# Add your production domain here when deploying
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    # Add your production URLs here:
    # "https://yourdomain.com",
    # "https://your-app.pages.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for RAG components (initialized on startup)
vectorstore = None
retriever = None
llm = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    conversation_id: str


@app.on_event("startup")
async def startup_event():
    """Initialize RAG components on server startup"""
    global vectorstore, retriever, llm
    
    print("🚀 Initializing ShareMatch AI Chatbot...")
    
    # Load or create vector store
    if not os.path.exists(CHROMA_DIR):
        print("📄 Creating new vector store from documents...")
        docs = load_and_split_documents()
        vectorstore = get_vectorstore(docs)
    else:
        print("📦 Loading existing vector store...")
        vectorstore = get_vectorstore()
    
    retriever = get_retriever(vectorstore)
    llm = get_llm()
    
    print("✅ Chatbot ready!")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ShareMatch AI Chatbot"}


@app.get("/health")
async def health_check():
    """Health check for the API"""
    return {"status": "ok", "rag_initialized": vectorstore is not None}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to the chatbot and get a response
    """
    global retriever, llm
    
    if not retriever or not llm:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    
    try:
        # Retrieve relevant documents
        docs = retriever.invoke(request.message)
        context = "\n\n".join(d.page_content for d in docs)
        
        # Create prompt with context
        prompt = f"""You are ShareMatch AI, a helpful assistant for the ShareMatch platform. 
Answer the question based on the context provided. Be friendly, professional, and concise.
If you don't know the answer based on the context, say so politely and suggest contacting support.

Context:
{context}

Question: {request.message}

Answer:"""
        
        # Get LLM response
        response = llm.invoke(prompt)
        
        # Generate or use existing conversation ID
        conversation_id = request.conversation_id or f"conv_{os.urandom(8).hex()}"
        
        return ChatResponse(
            message=response.content,
            conversation_id=conversation_id
        )
        
    except Exception as e:
        print(f"❌ Error processing chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing your message: {str(e)}")


@app.post("/clear")
async def clear_conversation():
    """
    Clear conversation (for future session management)
    Currently just returns success as conversations are stateless
    """
    return {"status": "cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
