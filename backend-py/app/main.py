import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin_routes, auth_routes, organizer_routes

app = FastAPI(title="results.togyz API")

_default_origins = "http://localhost:3000,https://9results.vercel.app"

# Vercel preview deployments get a generated subdomain per branch.
_PREVIEW_ORIGIN_REGEX = r"https://.*\.vercel\.app"


def parse_origins(value: str) -> list[str]:
    """Split a CORS_ORIGINS env var into exact origins.

    Tolerates spaces after commas and trailing slashes: an Origin header is
    always bare (`https://host`), so a stray space or slash in the allow-list
    silently blocks the site with a confusing browser-side CORS error.
    """
    return [o.strip().rstrip("/") for o in value.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_origins(os.environ.get("CORS_ORIGINS", _default_origins)),
    allow_origin_regex=_PREVIEW_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")
app.include_router(organizer_routes.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"ok": True}
