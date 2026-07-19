"""CORS configuration.

A misconfigured allow-list shows up in the browser as
"No 'Access-Control-Allow-Origin' header is present", which is easy to mistake
for a server outage — so the parsing is covered directly.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import parse_origins


def test_parse_origins_splits_on_comma():
    assert parse_origins("https://a.com,https://b.com") == [
        "https://a.com", "https://b.com"
    ]


def test_parse_origins_tolerates_spaces_after_commas():
    # "a, b" in a Render env var must not yield " b", which never matches
    assert parse_origins("https://a.com, https://b.com") == [
        "https://a.com", "https://b.com"
    ]


def test_parse_origins_drops_empties_and_trailing_commas():
    assert parse_origins("https://a.com,,  ,") == ["https://a.com"]


def test_parse_origins_strips_trailing_slash():
    # an Origin header never has a trailing slash, so neither may the allow-list
    assert parse_origins("https://a.com/") == ["https://a.com"]


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://9results.vercel.app")
    import importlib

    from app import main
    importlib.reload(main)
    return TestClient(main.app)


def test_allowed_origin_gets_the_header(client):
    r = client.get("/api/health", headers={"Origin": "https://9results.vercel.app"})
    assert r.headers.get("access-control-allow-origin") == "https://9results.vercel.app"


def test_vercel_preview_deployments_are_allowed(client):
    preview = "https://9results-git-feature-ansar.vercel.app"
    r = client.get("/api/health", headers={"Origin": preview})
    assert r.headers.get("access-control-allow-origin") == preview


def test_unrelated_origin_is_not_allowed(client):
    r = client.get("/api/health", headers={"Origin": "https://evil.example.com"})
    assert r.headers.get("access-control-allow-origin") is None
