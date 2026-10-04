import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import shutil
import gc
from typing import List, Dict, Any, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import FastEmbedEmbeddings
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
        """Initialize FastEmbed Embeddings (ONNX runtime, <100MB RAM) and Groq LLM."""
        print(f"Initializing Embeddings: {EMBEDDING_MODEL}")
        self.embeddings = FastEmbedEmbeddings(
            model_name=EMBEDDING_MODEL,
            batch_size=32,
            threads=1
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
        3. Index into ChromaDB with FastEmbed Embeddings.
        """
        # Load PDF
        try:
            loader = PyPDFLoader(file_path)
            raw_documents = loader.load()
        except Exception as e:
            print(f"PyPDFLoader error: {e}")
            raise ValueError(f"Failed to read PDF file: {str(e)}")
        
        total_pages = len(raw_documents)
        if total_pages == 0:
            raise ValueError("The uploaded PDF is empty or contains no extractable text.")

        # Cap max pages for 512MB RAM free tier performance
        MAX_PAGES = 50
        if total_pages > MAX_PAGES:
            print(f"Document has {total_pages} pages; processing first {MAX_PAGES} pages for server performance.")
            raw_documents = raw_documents[:MAX_PAGES]

        # Text Splitting
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = text_splitter.split_documents(raw_documents)

        if not chunks:
            raise ValueError("Could not extract text chunks from the PDF.")

        # Cap max chunks to 40 for sub-second vector store indexing on Render free tier
        MAX_CHUNKS = 40
        if len(chunks) > MAX_CHUNKS:
            print(f"Truncating {len(chunks)} chunks to top {MAX_CHUNKS} chunks for fast processing.")
            chunks = chunks[:MAX_CHUNKS]

        # Clear previous Chroma collection safely
        self.reset_vector_store()

        # Create Chroma Vector Store
        try:
            self.vector_store = Chroma.from_documents(
                documents=chunks,
                embedding=self.embeddings,
                persist_directory=str(CHROMA_DB_DIR)
            )
        except Exception as e:
            print(f"Chroma DB embedding/indexing error: {e}")
            raise ValueError(f"Failed to index document in vector store: {str(e)}")

        gc.collect()

        self.current_document_info = {
            "filename": filename,
            "file_path": file_path,
            "total_pages": total_pages,
            "processed_pages": min(total_pages, MAX_PAGES),
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

        fallback_models = ["llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]
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
        """Reset Chroma vector store and current document metadata without file locks."""
        if self.vector_store is not None:
            try:
                self.vector_store.delete_collection()
            except Exception as e:
                print(f"Notice during vector collection reset: {e}")
            self.vector_store = None
            
        self.current_document_info = None

    def get_status(self) -> Dict[str, Any]:
        """Return status of current processed document."""
        return {
            "has_document": self.vector_store is not None,
            "document_info": self.current_document_info
        }

# Global singleton engine instance
rag_engine = DocuQueryEngine()
