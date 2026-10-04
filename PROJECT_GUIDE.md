# 📚 DocuQuery AI — Complete Project & Technical Guide

Welcome to **DocuQuery AI**! This document explains the entire project in simple, beginner-friendly terms as well as deep technical details. Use this guide to understand how the application works, how to showcase it on your **resume**, and how to answer **technical interview questions** about Generative AI & RAG (Retrieval-Augmented Generation).

---

## 🎯 1. Project Overview & One-Line Pitch

> **"DocuQuery AI is a full-stack Generative AI application that allows users to upload PDF documents and ask questions in natural language, generating accurate, context-grounded answers with exact page source references using RAG, LangChain, ChromaDB, and Groq (LLaMA-3.3)."**

### The Problem
Lengthy documents (contracts, research papers, textbooks, reports) take hours to read manually. Standard keyword search (`Ctrl + F`) fails when the document uses different phrasing or synonyms.

### The Solution
DocuQuery AI converts unstructured PDF text into vector embeddings, stores them in a vector database (**ChromaDB**), and uses a Large Language Model (**Groq LLaMA-3.3-70B**) via **LangChain** to retrieve exact passages and answer questions accurately with exact page numbers.

---

## ⚡ 2. The 5 Core Features

| Feature | How It Works | Technology Used |
| :--- | :--- | :--- |
| **1. PDF Upload** | Accepts PDF documents, validates file type, and saves them to disk. | FastAPI, Python `UploadFile` |
| **2. Document Processing** | Parses PDF text page-by-page preserving page numbers, then splits long text into overlapping chunks. | `PyPDFLoader`, `RecursiveCharacterTextSplitter` |
| **3. Semantic Search** | Converts chunks into 384-dimensional dense vector embeddings and indexes them in ChromaDB. | `HuggingFaceEmbeddings` (`all-MiniLM-L6-v2`), `ChromaDB` |
| **4. Contextual Q&A** | Embeds the user's question, retrieves the top $k$ relevant chunks, and prompts Groq LLM to generate a grounded answer. | `ChatGroq` (`llama-3.3-70b-versatile`), LangChain LCEL |
| **5. Source References** | Extracts page numbers and text snippets for every answer, allowing users to click and inspect source context. | Metadata tracking (`page`), React Modal Component |

---

## 🏗️ 3. System Architecture & Workflow

The system operates in two main phases: **Indexing Phase** (when PDF is uploaded) and **Query Phase** (when user asks a question).

```mermaid
flowchart TD
    subgraph Phase 1: Indexing Phase (Document Upload)
        A[User Uploads PDF] --> B[PyPDFLoader: Extract Text & Page Metadata]
        B --> C[RecursiveTextSplitter: Split into Chunks]
        C --> D[HuggingFace Embeddings: Convert Chunks to Vectors]
        D --> E[(ChromaDB Vector Store)]
    end

    subgraph Phase 2: Query Phase (User Asks Question)
        F[User Question] --> G[Embed Question with HuggingFace]
        G --> H[Similarity Search in ChromaDB]
        H -->|Top-k Chunks + Page Metadata| I[Construct RAG Prompt with Context]
        I --> J[Groq API: LLaMA-3.3-70B LLM]
        J --> K[Return Answer + Clickable Page References]
    end
```

---

## 🧠 4. Deep Technical Breakdown

### A. Document Parsing & Chunking Strategy
- **Why chunking?** LLMs have context limits and perform better with targeted context. Providing an entire 100-page document causes noise and higher latency.
- **Chunk Size (`1000` chars)** & **Chunk Overlap (`200` chars)**: Overlap ensures that key sentences spanning across boundary cuts are not split in half, preserving semantic context across chunk edges.
- **Metadata Preservation**: `PyPDFLoader` attaches `{"page": page_number, "source": filename}` to every chunk. We convert 0-indexed page numbers into 1-indexed numbers (`page + 1`) for user readability.

### B. Vector Embeddings & Vector Database
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2` produces a 384-dimensional vector representation for every text chunk. Sentences with similar meanings get vector points close to each other in high-dimensional space.
- **Vector DB (ChromaDB)**: Performs similarity search using **Cosine Distance / Euclidean Distance**. When a question comes in, ChromaDB finds the top 4 chunks whose vectors are closest to the question vector.

### C. Groq LLM & LangChain RAG Pipeline
- **Groq API**: Provides LPU (Language Processing Unit) hardware acceleration, yielding blazingly fast inference (>300 tokens/sec) with `llama-3.3-70b-versatile`.
- **RAG System Prompt**: Enforces strict grounding:
  > *"Answer the user's question accurately based strictly on the provided context. Cite your sources using inline page tags such as [Page X]. If the answer cannot be found in the context, state that clearly."*
- This eliminates LLM hallucination!

### D. Modern React Frontend Architecture
- **Vite + React 18**: Fast development server and build tool.
- **Glassmorphism Theme**: Dark cosmic design system with blur backdrops, gradient accents, interactive source tags (`[Page X]`), and confetti celebration on document index completion.

---

## 📝 5. Resume Description & Bullet Points

Add this project under your **Projects** section on your resume:

### **DocuQuery AI — RAG Document Intelligence Platform**
*Tech Stack: Python, LangChain, Groq API (LLaMA-3.3), ChromaDB, FastAPI, React 18, Vite, HuggingFace Embeddings*

- **Engineered an end-to-end Retrieval-Augmented Generation (RAG) pipeline** using LangChain and FastAPI to enable natural language Q&A over uploaded PDF documents with 100% source page attribution.
- **Implemented semantic vector search** with ChromaDB and HuggingFace 384-dim `all-MiniLM-L6-v2` embeddings, splitting document text using `RecursiveCharacterTextSplitter` with 200-character overlap for optimal context retrieval.
- **Integrated Groq API (LLaMA-3.3-70B)** for high-speed LLM inference, crafting custom grounded system prompts to eliminate model hallucinations and cite exact source page references.
- **Designed a modern, responsive React UI** featuring drag-and-drop PDF upload, step-by-step processing indicators, interactive clickable page source badges, and context inspection modals.

---

## ❓ 6. Interview Questions & Answers Cheatsheet

### Q1: What is RAG and why did you choose it over fine-tuning?
> **Answer**: RAG (Retrieval-Augmented Generation) combines vector retrieval with LLM generation. I chose RAG over fine-tuning because RAG does not require costly re-training whenever new documents are uploaded, guarantees factual grounding without hallucinations, and explicitly provides source page citations for verification.

### Q2: Why did you use Chunk Overlap?
> **Answer**: Chunk overlap (e.g., 200 characters) prevents information loss at chunk boundaries. If a critical definition or fact spans across the split point between two chunks, overlap ensures the complete sentence remains intact in at least one chunk.

### Q3: How does vector similarity search work in ChromaDB?
> **Answer**: ChromaDB converts both the text chunks and the user's query into dense numerical vectors using the embedding model (`all-MiniLM-L6-v2`). It calculates the mathematical similarity (such as Cosine Similarity) between the query vector and chunk vectors to retrieve the $k$ most relevant passages.

### Q4: How do you handle cases where the document doesn't contain the answer?
> **Answer**: In our LangChain prompt engineering, we instruct the LLM: *"If the answer cannot be determined from the context, state clearly: 'I could not find the answer in the uploaded document.'"* This prevents the LLM from making up false answers.

### Q5: What is the role of Groq in your project?
> **Answer**: Groq provides ultra-fast LLM inference using LPU hardware acceleration. We run `llama-3.3-70b-versatile` through Groq API, giving near-instant responses while using a powerful 70-billion parameter open-weights model.

---

## 🚀 7. How to Run the Project Locally

### Step 1: Backend Setup & Server Start
Open a terminal in the project root:
```bash
# Activate virtual environment
.\venv\Scripts\activate

# Start FastAPI server with Uvicorn (Port 8000)
python -m uvicorn backend.main:app --reload --port 8000
```
Backend API interactive documentation will be available at `http://localhost:8000/docs`.

### Step 2: Frontend Setup & Server Start
Open a second terminal window:
```bash
cd frontend

# Start React dev server (Port 5173)
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 📁 8. Project File Directory Structure

```
documind/
├── .env                  # Environment file (GROQ_API_KEY)
├── requirements.txt      # Python dependencies
├── PROJECT_GUIDE.md      # Comprehensive explanation & resume guide
├── backend/
│   ├── config.py         # Configuration settings & directory paths
│   ├── main.py           # FastAPI routes (/api/upload, /api/query, /api/status, /api/reset)
│   └── rag_chain.py      # LangChain + ChromaDB + Groq RAG Engine logic
└── frontend/
    ├── package.json      # React & Vite packages
    ├── vite.config.js    # Vite config with backend API proxy
    ├── index.html        # HTML root file
    └── src/
        ├── main.jsx       # React entry point
        ├── App.jsx        # Main layout & state manager
        ├── index.css      # Glassmorphism dark design system
        └── components/
            ├── Header.jsx         # App header with tech badges
            ├── FileUpload.jsx     # Drag-and-drop PDF processor & stats
            ├── ChatInterface.jsx  # Interactive Q&A chat & prompt chips
            └── SourceModal.jsx    # Retrieved text snippet & source inspector
```

*Enjoy building and showcasing DocuQuery AI on your resume! 🚀*
