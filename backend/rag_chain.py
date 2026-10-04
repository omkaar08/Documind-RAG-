import os
import shutil
from typing import List, Dict, Any, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from backend.config import (
    GROQ_API_KEY,
    UPLOADS_DIR,
    CHROMA_DB_DIR,
    DEFAULT_LLM_MODEL,
    EMBEDDING_MODEL,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)

class DocuQueryEngine:
    def __init__(self):
        self.embeddings = None
        self.vector_store = None
        self.llm = None
        self.current_document_info = None
        self._init_components()

    def _init_components(self):
        """Initialize HuggingFace Embeddings and Groq LLM."""
        print(f"Initializing Embeddings: {EMBEDDING_MODEL}")
        self.embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        if GROQ_API_KEY:
            self.llm = ChatGroq(
                groq_api_key=GROQ_API_KEY,
                model_name=DEFAULT_LLM_MODEL,
                temperature=0.2,
                max_tokens=1024
            )
        else:
            print("WARNING: GROQ_API_KEY is not set.")

        # Re-load existing chroma DB if present
        if os.path.exists(CHROMA_DB_DIR) and len(os.listdir(CHROMA_DB_DIR)) > 0:
            try:
                self.vector_store = Chroma(
                    persist_directory=str(CHROMA_DB_DIR),
                    embedding_function=self.embeddings
                )
                print("Loaded existing Chroma vector database.")
            except Exception as e:
                print(f"Failed to load existing Chroma DB: {e}")
                self.vector_store = None

    def process_pdf(self, file_path: str, filename: str) -> Dict[str, Any]:
        """
        1. Extract text page by page with PyPDFLoader.
        2. Chunk text with RecursiveCharacterTextSplitter.
        3. Index into ChromaDB with HuggingFace Embeddings.
        """
        # Load PDF
        loader = PyPDFLoader(file_path)
        raw_documents = loader.load()
        
        total_pages = len(raw_documents)
        if total_pages == 0:
            raise ValueError("The uploaded PDF is empty or could not be read.")

        # Text Splitting
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = text_splitter.split_documents(raw_documents)

        # Clear previous Chroma DB for single-doc active session clarity
        self.reset_vector_store()

        # Create Chroma Vector Store
        self.vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory=str(CHROMA_DB_DIR)
        )

        self.current_document_info = {
            "filename": filename,
            "file_path": file_path,
            "total_pages": total_pages,
            "total_chunks": len(chunks),
            "chunk_size": CHUNK_SIZE,
            "chunk_overlap": CHUNK_OVERLAP,
            "embedding_model": EMBEDDING_MODEL,
            "llm_model": DEFAULT_LLM_MODEL
        }

        return self.current_document_info

    def query_rag(self, question: str, top_k: int = 4) -> Dict[str, Any]:
        """
        1. Perform semantic search in ChromaDB.
        2. Retrieve relevant chunks with metadata (source, page).
        3. Formulate RAG prompt and get answer from Groq LLM.
        4. Return answer + source references.
        """
        if not self.vector_store:
            raise ValueError("No document has been processed yet. Please upload a PDF first.")

        if not self.llm:
            if not GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY is missing. Please check your .env file.")
            self.llm = ChatGroq(
                groq_api_key=GROQ_API_KEY,
                model_name=DEFAULT_LLM_MODEL,
                temperature=0.2
            )

        # Perform similarity search with distance score
        results_with_score = self.vector_store.similarity_search_with_score(question, k=top_k)

        # Prepare context and structured source metadata
        context_texts = []
        sources = []

        for idx, (doc, score) in enumerate(results_with_score):
            # PyPDF metadata page is 0-indexed, convert to 1-indexed for display
            page_num = doc.metadata.get("page", 0) + 1 if isinstance(doc.metadata.get("page"), int) else doc.metadata.get("page", 1)
            
            snippet = doc.page_content.strip()
            context_texts.append(f"[Source {idx+1} | Page {page_num}]:\n{snippet}")
            
            # Score conversion: Chroma cosine distance (lower is closer) or similarity score
            relevance_percentage = max(0, round((1.0 - float(score)) * 100, 1)) if score <= 1.0 else round(100 / (1.0 + float(score)), 1)
            
            sources.append({
                "source_id": idx + 1,
                "page": page_num,
                "snippet": snippet,
                "score": float(score),
                "relevance": f"{relevance_percentage}%"
            })

        combined_context = "\n\n".join(context_texts)

        # RAG Prompt definition
        rag_prompt = ChatPromptTemplate.from_messages([
            ("system", 
             "You are DocuQuery AI, an expert document query assistant. "
             "Your job is to answer the user's question accurately based strictly on the provided context below.\n"
             "Rules:\n"
             "1. Synthesize a concise, clear, and comprehensive answer.\n"
             "2. Cite your sources using inline page tags such as [Page X] whenever referencing facts from the text.\n"
             "3. If the answer cannot be determined from the context, state clearly: 'I could not find the answer to this question in the uploaded document.'\n\n"
             "Context:\n{context}"),
            ("human", "{question}")
        ])

        chain = rag_prompt | self.llm | StrOutputParser()

        fallback_models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
        response_answer = None

        try:
            response_answer = chain.invoke({
                "context": combined_context,
                "question": question
            })
        except Exception as primary_err:
            print(f"Primary LLM invocation failed ({getattr(self.llm, 'model_name', DEFAULT_LLM_MODEL)}): {primary_err}. Attempting fallback models...")
            for fallback_m in fallback_models:
                try:
                    self.llm = ChatGroq(
                        groq_api_key=GROQ_API_KEY,
                        model_name=fallback_m,
                        temperature=0.2
                    )
                    fallback_chain = rag_prompt | self.llm | StrOutputParser()
                    response_answer = fallback_chain.invoke({
                        "context": combined_context,
                        "question": question
                    })
                    print(f"Successfully generated response using fallback model: {fallback_m}")
                    break
                except Exception as fb_err:
                    print(f"Fallback model {fallback_m} failed: {fb_err}")

        if not response_answer:
            raise ValueError("All configured LLM models failed to process the request. Please check your Groq API key and model availability.")

        return {
            "question": question,
            "answer": response_answer,
            "sources": sources,
            "document": self.current_document_info["filename"] if self.current_document_info else "Uploaded Document"
        }

    def reset_vector_store(self):
        """Reset Chroma vector store and current document metadata."""
        if self.vector_store:
            try:
                self.vector_store.delete_collection()
            except Exception:
                pass
            self.vector_store = None
        
        if os.path.exists(CHROMA_DB_DIR):
            shutil.rmtree(CHROMA_DB_DIR, ignore_errors=True)
            os.makedirs(CHROMA_DB_DIR, exist_ok=True)
            
        self.current_document_info = None

    def get_status(self) -> Dict[str, Any]:
        """Return status of current processed document."""
        return {
            "has_document": self.vector_store is not None,
            "document_info": self.current_document_info
        }

# Global singleton engine instance
rag_engine = DocuQueryEngine()
