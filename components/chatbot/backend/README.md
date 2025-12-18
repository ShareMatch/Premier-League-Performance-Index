# ShareMatch AI Chatbot Backend

A RAG (Retrieval-Augmented Generation) chatbot powered by Groq LLM and HuggingFace embeddings.

## Setup

### 1. Create Virtual Environment

```bash
cd components/chatbot/backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

Create a `.env` file in the `components/chatbot/` folder:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your free Groq API key at: https://console.groq.com/keys

### 4. Run the Server

```bash
python app.py
```

Or with uvicorn directly:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The server will start at `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

### Chat
```
POST /chat
Content-Type: application/json

{
  "message": "What is ShareMatch?",
  "conversation_id": "optional-id"
}
```

Response:
```json
{
  "message": "ShareMatch is...",
  "conversation_id": "conv_abc123"
}
```

### Clear Conversation
```
POST /clear
```

## Architecture

- **loader.py** - Loads and splits PDF documents
- **embeddings.py** - Creates/loads vector store with HuggingFace embeddings
- **retriever.py** - Configures document retrieval
- **model.py** - Initializes Groq LLM
- **config.py** - Configuration settings
- **app.py** - FastAPI server

## Notes

- First run will take longer as it downloads the embedding model and creates the vector store
- The vector store is persisted in `chroma_db/` folder
- Uses free Groq API for LLM (very fast inference)
- Uses free HuggingFace embeddings (runs locally)
