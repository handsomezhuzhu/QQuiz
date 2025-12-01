"""
QQuiz FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from database import init_db, init_default_config, get_db_context

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting QQuiz Application...")

    # Initialize database
    await init_db()

    # Initialize default configurations
    async with get_db_context() as db:
        await init_default_config(db)

    # Create uploads directory
    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    print(f"📁 Upload directory: {upload_dir}")

    print("✅ Application started successfully!")

    yield

    # Shutdown
    print("👋 Shutting down QQuiz Application...")


# Create FastAPI app
app = FastAPI(
    title="QQuiz API",
    description="智能刷题与题库管理平台",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to QQuiz API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Import and include routers
from routers import auth, exam, question, mistake, admin

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(exam.router, prefix="/api/exams", tags=["Exams"])
app.include_router(question.router, prefix="/api/questions", tags=["Questions"])
app.include_router(mistake.router, prefix="/api/mistakes", tags=["Mistakes"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
