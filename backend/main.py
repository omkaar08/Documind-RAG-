import os
import shutil
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

from backend.config import UPLOADS_DIR, BASE_DIR
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

# Serve frontend build if dist folder exists (Production unified deployment)
dist_dir = BASE_DIR / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to DocuQuery AI API",
            "status": "online",
            "documentation": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)

