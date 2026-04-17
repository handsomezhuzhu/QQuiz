"""
QQuiz FastAPI Application - single-container API and frontend proxy.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import httpx
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.background import BackgroundTask

from database import init_db, init_default_config, get_db_context
from rate_limit import limiter

# Load environment variables
load_dotenv()

NEXT_SERVER_URL = os.getenv("NEXT_SERVER_URL", "http://127.0.0.1:3000").rstrip("/")
INTERNAL_API_URL = os.getenv("INTERNAL_API_URL", "http://127.0.0.1:8000").rstrip("/")
SESSION_COOKIE_NAME = "access_token"
FRONTEND_PROXY_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-length",
}


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."}
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting QQuiz Application...")

    app.state.frontend_client = httpx.AsyncClient(
        follow_redirects=False,
        timeout=httpx.Timeout(30.0, connect=5.0),
    )

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
    await app.state.frontend_client.aclose()
    print("👋 Shutting down QQuiz Application...")


# Create FastAPI app
app = FastAPI(
    title="QQuiz API",
    description="智能刷题与题库管理平台",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

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

    try:
        response = await app.state.frontend_client.get(
            f"{NEXT_SERVER_URL}/login",
            headers={"Accept-Encoding": "identity"},
        )
    except httpx.HTTPError:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "api": "healthy",
                "frontend": "unavailable",
            },
        )

    frontend_status = "healthy" if response.status_code < 500 else "unavailable"
    if frontend_status != "healthy":
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "api": "healthy",
                "frontend": frontend_status,
            },
        )

    return {"status": "healthy", "api": "healthy", "frontend": "healthy"}


def build_frontend_target(request: Request, full_path: str) -> str:
    normalized_path = f"/{full_path}" if full_path else "/"
    query = request.url.query
    return f"{NEXT_SERVER_URL}{normalized_path}{f'?{query}' if query else ''}"


def build_internal_api_target(request: Request, full_path: str, trailing_slash: bool = False) -> str:
    normalized_path = full_path.strip("/")
    if trailing_slash and normalized_path:
        normalized_path = f"{normalized_path}/"
    query = request.url.query
    return f"{INTERNAL_API_URL}/api/{normalized_path}{f'?{query}' if query else ''}"


def filter_proxy_headers(request: Request) -> dict[str, str]:
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "host"
    }
    # Avoid sending compressed payloads through the proxy so response headers stay accurate.
    headers["Accept-Encoding"] = "identity"
    return headers


def apply_proxy_headers(proxy_response: StreamingResponse, upstream_headers: httpx.Headers) -> None:
    proxy_response.raw_headers = [
        (key.encode("latin-1"), value.encode("latin-1"))
        for key, value in upstream_headers.multi_items()
        if key.lower() not in HOP_BY_HOP_HEADERS
    ]


@app.api_route("/frontend-api/proxy/{full_path:path}", methods=FRONTEND_PROXY_METHODS, include_in_schema=False)
async def proxy_browser_api(request: Request, full_path: str):
    """
    Serve browser-originated API calls directly from FastAPI in single-container mode.
    This avoids relying on Next.js route handlers for the /frontend-api/proxy/* namespace.
    """
    target = build_internal_api_target(request, full_path)
    body = await request.body()
    client: httpx.AsyncClient = app.state.frontend_client
    headers = filter_proxy_headers(request)
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        async def send_request(target_url: str) -> httpx.Response:
            upstream_request = client.build_request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body if body else None,
            )
            return await client.send(
                upstream_request,
                stream=True,
                follow_redirects=True,
            )

        upstream_response = await send_request(target)
        if (
            request.method in {"GET", "HEAD"}
            and upstream_response.status_code == 404
            and full_path
            and not full_path.endswith("/")
        ):
            await upstream_response.aclose()
            upstream_response = await send_request(
                build_internal_api_target(request, full_path, trailing_slash=True)
            )
    except httpx.HTTPError:
        return JSONResponse(
            status_code=502,
            content={"detail": "Backend API is unavailable."},
        )

    proxy_response = StreamingResponse(
        upstream_response.aiter_raw(),
        status_code=upstream_response.status_code,
        background=BackgroundTask(upstream_response.aclose),
    )
    apply_proxy_headers(proxy_response, upstream_response.headers)
    return proxy_response


@app.api_route("/", methods=FRONTEND_PROXY_METHODS, include_in_schema=False)
@app.api_route("/{full_path:path}", methods=FRONTEND_PROXY_METHODS, include_in_schema=False)
async def proxy_frontend(request: Request, full_path: str = ""):
    """
    Forward all non-API traffic to the embedded Next.js server.
    FastAPI keeps ownership of /api/*, /docs, /openapi.json, /redoc and /health.
    """
    target = build_frontend_target(request, full_path)
    body = await request.body()
    client: httpx.AsyncClient = app.state.frontend_client

    try:
        upstream_request = client.build_request(
            method=request.method,
            url=target,
            headers=filter_proxy_headers(request),
            content=body if body else None,
        )
        upstream_response = await client.send(upstream_request, stream=True)
    except httpx.HTTPError:
        return JSONResponse(
            status_code=502,
            content={"detail": "Frontend server is unavailable."},
        )

    proxy_response = StreamingResponse(
        upstream_response.aiter_raw(),
        status_code=upstream_response.status_code,
        background=BackgroundTask(upstream_response.aclose),
    )
    apply_proxy_headers(proxy_response, upstream_response.headers)
    return proxy_response
