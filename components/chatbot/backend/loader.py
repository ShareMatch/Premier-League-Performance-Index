from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import DATA_PATH, CHUNK_SIZE, CHUNK_OVERLAP


def load_and_split_documents():
    """
    Loads PDF FAQs and splits them into chunks.
    """
    print("📄 Loading PDF...")
    loader = PyPDFLoader(str(DATA_PATH))
    documents = loader.load()

    print("✂️ Splitting text...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )

    chunks = splitter.split_documents(documents)
    return chunks
