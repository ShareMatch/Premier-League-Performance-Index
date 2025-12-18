from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from config import CHROMA_DIR, EMBEDDING_MODEL


def get_vectorstore(documents=None):
    # HuggingFace embeddings run locally - completely FREE, no API key needed!
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    if documents:
        print("🧬 Creating new vector store...")
        return Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=str(CHROMA_DIR)
        )

    print("📦 Loading existing vector store...")
    return Chroma(
        persist_directory=str(CHROMA_DIR),
        embedding_function=embeddings
    )
