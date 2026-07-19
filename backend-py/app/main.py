import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin_routes, auth_routes, organizer_routes

app = FastAPI(title="results.togyz API")

_default_origins = "http://localhost:3000,https://9results.vercel.app"
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", _default_origins).split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")
app.include_router(organizer_routes.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"ok": True}
