import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory setup
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file at workspace root
dotenv_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=dotenv_path)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Uploads directory & ChromaDB persistence directory
UPLOADS_DIR = BASE_DIR / "backend" / "uploads"
CHROMA_DB_DIR = BASE_DIR / "backend" / "chroma_db"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DB_DIR.mkdir(parents=True, exist_ok=True)

# Default LLM and Embeddings configurations
DEFAULT_LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 150
