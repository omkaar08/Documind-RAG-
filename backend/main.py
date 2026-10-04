import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from backend.config import UPLOADS_DIR
from backend.rag_chain import rag_engine

app = FastAPI(
    title="DocuQuery AI Backend",
    description="FastAPI + LangChain + ChromaDB + Groq RAG Engine API",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    top_k: Optional[int] = 4

@app.get("/")
def root():
    return {
        "message": "Welcome to DocuQuery AI API",
        "status": "online",
        "documentation": "/docs"
    }

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a PDF file."
        )
    
    file_path = UPLOADS_DIR / file.filename

    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process document through RAG engine
        doc_info = rag_engine.process_pdf(str(file_path), file.filename)

        return {
            "success": True,
            "message": f"Successfully processed '{file.filename}'",
            "data": doc_info
        }
    except Exception as e:
        print(f"Error processing PDF: {e}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query")
async def query_document(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    try:
        result = rag_engine.query_rag(question=request.question, top_k=request.top_k)
        return {
            "success": True,
            "data": result
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error querying document: {e}")
        raise HTTPException(status_code=500, detail=f"Internal RAG Error: {str(e)}")

@app.get("/api/status")
async def get_status():
    return {
        "success": True,
        "data": rag_engine.get_status()
    }

@app.post("/api/reset")
async def reset_session():
    try:
        rag_engine.reset_vector_store()
        return {
            "success": True,
            "message": "Vector store and session successfully reset."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
