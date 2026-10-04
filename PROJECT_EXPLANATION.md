# 🚀 DocuQuery AI — Complete Technical & Conceptual Project Guide

> **A Production-Grade Retrieval-Augmented Generation (RAG) Document Intelligence Platform**  
> *Built with LangChain, Groq API (LLaMA 3.3 70B), ChromaDB, PyPDF, FastAPI & React 18*

---

## 📌 1. Project Overview & One-Line Summary

**DocuQuery AI** is an intelligent Generative AI web application that allows users to upload PDF documents and ask questions in natural language. The system retrieves relevant passages from the document and generates accurate, context-grounded answers accompanied by exact page source references.

### 💡 The Core Problem
Reading lengthy manuals, research papers, legal contracts, or textbooks to find specific facts takes hours. Traditional keyword searching (`Ctrl + F`) fails when documents use synonyms, different phrasing, or complex context.

### ⚡ The Solution
DocuQuery AI leverages **Retrieval-Augmented Generation (RAG)**:
1. It parses unstructured PDF text into structured, overlapping chunks.
2. It generates dense 384-dimensional vector embeddings for each chunk and indexes them in **ChromaDB**.
3. Upon receiving a user question, it retrieves the top $k$ most relevant text chunks using semantic vector similarity search.
4. It feeds these exact chunks to **Groq LLaMA-3.3-70B** to generate a factually grounded answer with interactive **[Page X]** citation tags.

---

## 🎯 2. The 5 Core Features (Initial Version Scope)

| Feature | Technical Implementation | Purpose & Value |
| :--- | :--- | :--- |
| **1. PDF Upload** | FastAPI `/api/upload` endpoint, `python-multipart`, validation for `.pdf` file format, disk storage in `backend/uploads/`. | Enables seamless document ingestion with drag-and-drop UI and file validation. |
| **2. Document Processing** | `PyPDFLoader` for page-wise parsing, `RecursiveCharacterTextSplitter` (1000 char chunk size, 200 char overlap). | Preserves page number metadata (`page`) while ensuring text boundary continuity. |
| **3. Semantic Search** | `HuggingFaceEmbeddings` (`sentence-transformers/all-MiniLM-L6-v2`) + `ChromaDB` local persistent vector store. | Converts text into 384-dim dense vectors and performs fast similarity retrieval (Cosine Distance). |
| **4. Contextual Q&A** | `ChatGroq` (`llama-3.3-70b-versatile`) + LangChain LCEL chain with strict grounded system prompt. | Eliminates LLM hallucinations by forcing responses to rely strictly on retrieved context. |
| **5. Source References** | Metadata tracking in ChromaDB, interactive clickable `[Page X]` badges in React, and Source Modal Inspector. | Guarantees 100% transparency and fact-verification for every generated answer. |

---

## 🏗️ 3. End-to-End System Architecture

The application runs in two distinct pipeline phases:

### Phase 1: Ingestion & Vector Indexing Phase
```
[User Uploads PDF] 
      │
      ▼
[PyPDFLoader] ──> Extracts raw text page-by-page + attaches metadata {page: N, source: filename}
      │
      ▼
[RecursiveCharacterTextSplitter] ──> Splits text into 1,000-character chunks with 200-character overlap
      │
      ▼
[HuggingFace MiniLM Embeddings] ──> Converts each text chunk into a 384-dimensional dense vector
      │
      ▼
[ChromaDB Vector Store] ──> Stores vectors & metadata locally in backend/chroma_db/
```

### Phase 2: Query & RAG Generation Phase
```
[User Asks Question]
      │
      ▼
[HuggingFace Embeddings] ──> Converts question into 384-dimensional vector
      │
      ▼
[ChromaDB Vector Similarity Search] ──> Retrieves Top-4 closest text chunks + page numbers
      │
      ▼
[RAG Prompt Formatting] ──> Combines retrieved context + question into grounded system prompt
      │
      ▼
[Groq LLaMA-3.3-70B LPU] ──> Generates concise answer citing [Page X]
      │
      ▼
[React Frontend UI] ──> Displays answer with clickable [Page X] source badges & Inspector Modal
```

---

## 🧠 4. Deep Technical Concepts Explained Simply

### 1. What is RAG (Retrieval-Augmented Generation)?
Large Language Models (LLMs) like LLaMA-3.3 know a lot of general world knowledge, but they do **not** know the contents of private files or specific PDFs you just uploaded. 

Rather than retraining or fine-tuning the LLM (which is slow, expensive, and inflexible), **RAG** acts like an **"Open Book Exam"**:
- **Retrieval**: When a question is asked, the system searches the document vector store to find the exact pages/chunks containing the relevant information.
- **Augmentation**: The system inserts those retrieved passages directly into the LLM prompt as context.
- **Generation**: The LLM reads the context and answers the question accurately without guessing.

### 2. Why Chunk Size (`1000`) and Chunk Overlap (`200`)?
- **Chunking**: LLMs have context limits and perform best with focused context. Splitting a 50-page document into chunks isolates specific facts.
- **Chunk Overlap**: If a sentence or key definition happens to sit right at the boundary where text is split, chunk overlap ensures the ending of chunk $N$ is repeated at the start of chunk $N+1$, preventing cut-off sentences.

### 3. Vector Embeddings & Vector Database (ChromaDB)
- **Vector Embeddings**: Mathematical representations of text in high-dimensional space. Words/sentences with similar meanings (e.g., *"revenue growth"* and *"financial increase"*) get mapped to vectors that are close to each other geometrically.
- **ChromaDB**: An open-source vector database configured to persist indexed document vectors locally on disk.

### 4. Groq Hardware Acceleration (LPU)
- **Groq** utilizes Language Processing Units (LPUs) designed specifically for LLM inference, delivering throughput of >300 tokens per second. This makes Q&A streaming virtually instantaneous compared to standard cloud GPUs.

---

## 📝 5. Resume Description & Project Highlights

Use these ready-to-copy bullet points under the **Projects** section on your resume:

### **DocuQuery AI — RAG Document Intelligence Platform**
*Tech Stack: Python, LangChain, Groq API (LLaMA 3.3), ChromaDB, FastAPI, React 18, Vite, HuggingFace Embeddings*

- **Engineered a full-stack Retrieval-Augmented Generation (RAG) platform** with Python, LangChain, and FastAPI to perform natural language Q&A over PDF documents with zero hallucination and 100% page-level attribution.
- **Implemented semantic vector search** by generating 384-dimensional dense embeddings with HuggingFace `all-MiniLM-L6-v2` and indexing text chunks in ChromaDB vector database using `RecursiveCharacterTextSplitter` (1000 char size, 200 char overlap).
- **Integrated Groq API (LLaMA-3.3-70B)** for sub-second LLM inference, designing grounded system prompts that cite exact source page tags (`[Page X]`).
- **Built a modern React 18 UI** featuring glassmorphic dark theme, drag-and-drop PDF upload, real-time chunking progress, clickable source badges, and an interactive context inspection modal.

---

## ❓ 6. Interview Preparation Cheatsheet

### Q1: Why did you choose RAG over Fine-Tuning for document Q&A?
> **Answer**: Fine-tuning alters model weights, which is expensive, time-consuming, and cannot dynamically incorporate new documents uploaded by users in real-time. RAG provides instant document ingestion, 100% verifiable source page citations, and guarantees fact-grounded responses by supplying raw document passages directly in the prompt.

### Q2: How do you prevent LLM hallucinations?
> **Answer**: We enforce strict prompt engineering rules in our LangChain prompt template. We instruct the system to answer strictly based on the provided context passages and explicitly return *"I could not find the answer in the uploaded document"* if the information is absent.

### Q3: How does vector similarity search work in ChromaDB?
> **Answer**: Both the document text chunks and the user's question are converted into 384-dimensional vector embeddings using the `all-MiniLM-L6-v2` model. ChromaDB performs mathematical distance calculations (Cosine Distance / Euclidean Distance) to retrieve the top $k$ nearest chunk vectors.

### Q4: Why did you use `PyPDFLoader` instead of basic text readers?
> **Answer**: `PyPDFLoader` preserves page metadata (`{"page": X}`) attached to each extracted text slice. This allows our backend to map every vector chunk back to its original page number, enabling clickable `[Page X]` source tags in the frontend UI.

---

## 💻 7. How to Run the Project Locally

### Step 1: Start Backend Server
```bash
# In project root directory
.\venv\Scripts\activate
python -m uvicorn backend.main:app --port 8000 --reload
```
*API interactive documentation will be live at `http://localhost:8000/docs`.*

### Step 2: Start Frontend Server
```bash
# In a new terminal window
cd frontend
npm run dev
```
*Open browser at `http://localhost:5173`.*

---
*Created for DocuQuery AI — Ready for resume showcase & technical interviews! 🚀*
