import os
import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings, WORKSPACE_ROOT
from backend.app.database import init_db
from backend.app.api.routes import router
from backend.app.services.demo_service import init_demo_sandbox

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sloth")

app = FastAPI(
    title="SLOTH — Your Local-First AI Productivity Agent",
    description="Privacy-first desktop organizer and document digest engine powered by local open-weight AI.",
    version=settings.version,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Restrictive CORS for local safety
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Initializing SLOTH database...")
    init_db()
    logger.info("Setting up initial demo sandbox...")
    try:
        init_demo_sandbox(force_reset=False)
    except Exception as e:
        logger.warning(f"Could not auto-populate demo sandbox: {e}")
    logger.info("SLOTH backend initialized successfully.")

# Include REST routes
app.include_router(router, prefix="/api")

# Mount frontend build if available
frontend_dist = WORKSPACE_ROOT / "frontend" / "dist"
if frontend_dist.exists() and frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error handling request {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.host, port=settings.port, reload=True)
