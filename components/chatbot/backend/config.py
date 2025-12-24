from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATA_PATH = BASE_DIR / "data" / "faq.pdf"
VIDEOS_PATH = BASE_DIR / "data" / "videos.json"
CHROMA_DIR = BASE_DIR / "chroma_db"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150

# HuggingFace Inference API model (384 dimensions, faster)
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384

GROQ_MODEL = "llama-3.1-8b-instant"

# Get API keys from environment
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")