from langchain_groq import ChatGroq
from config import GROQ_MODEL


def get_llm():
    # Groq - FREE and FAST!
    # Get your free API key at: https://console.groq.com/keys
    return ChatGroq(
        model=GROQ_MODEL,
        temperature=0.3,
    )
