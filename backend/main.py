"""
QQuiz FastAPI Application - 单容器模式（前后端整合）
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from contextlib import asynccontextmanager
import os
from pathlib import Path
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


# Import and include routers
from routers import auth, exam, question, mistake, admin

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(exam.router, prefix="/api/exams", tags=["Exams"])
app.include_router(question.router, prefix="/api/questions", tags=["Questions"])
app.include_router(mistake.router, prefix="/api/mistakes", tags=["Mistakes"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


# API 健康检查
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# ============ 静态文件服务（前后端整合） ============

# 检查静态文件目录是否存在
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    # 挂载静态资源（JS、CSS、图片等）
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="static_assets")

    # 前端应用的所有路由（SPA路由）
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """
        服务前端应用
        - API 路由已在上面定义，优先匹配
        - 其他所有路由返回 index.html（SPA 单页应用）
        """
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        else:
            return {
                "message": "Frontend not built yet",
                "hint": "Run 'cd frontend && npm run build' to build the frontend"
            }
else:
    print("⚠️  静态文件目录不存在，前端功能不可用")
    print("提示：请先构建前端应用或使用开发模式")

    # 如果没有静态文件，显示 API 信息
    @app.get("/")
    async def root():
        """Root endpoint"""
        return {
            "message": "Welcome to QQuiz API",
            "version": "1.0.0",
            "docs": "/docs",
            "note": "Frontend not built. Please build frontend or use docker-compose."
        }
