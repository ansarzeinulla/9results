"""Login and official-creation error paths — clean 4xx, never a 500."""
from tests.conftest import auth


def _make_official(client, admin_token, username, password="orgpass123"):
    return client.post("/api/officials", headers=auth(admin_token), json={
        "first_name": "Err", "last_name": "Org", "title": "NA",
        "username": username, "password": password,
    })


# --- login ---

def test_wrong_password_is_401(client):
    r = client.post("/api/auth/login",
                    json={"username": "admin", "password": "nope"})
    assert r.status_code == 401


def test_unknown_username_is_401(client):
    r = client.post("/api/auth/login",
                    json={"username": "nobody-here", "password": "whatever"})
    assert r.status_code == 401


def test_empty_login_body_is_422(client):
    r = client.post("/api/auth/login", json={})
    assert r.status_code == 422


def test_inactive_user_cannot_log_in(client, admin_token, migrated_db):
    import psycopg
    _make_official(client, admin_token, "to-be-disabled")
    with psycopg.connect(migrated_db) as db:
        db.execute("UPDATE users SET is_active = FALSE WHERE username = %s",
                   ("to-be-disabled",))
        db.commit()
    r = client.post("/api/auth/login",
                    json={"username": "to-be-disabled", "password": "orgpass123"})
    assert r.status_code == 401


# --- bearer tokens ---

def test_missing_bearer_is_401(client):
    r = client.get("/api/my/tournaments")
    assert r.status_code in (401, 403)


def test_malformed_token_is_401(client):
    r = client.get("/api/my/tournaments", headers=auth("not.a.jwt"))
    assert r.status_code == 401


def test_wrong_signature_token_is_401(client):
    import jwt
    forged = jwt.encode({"sub": "1", "role": "ADMIN"}, "the-wrong-secret",
                        algorithm="HS256")
    r = client.get("/api/my/tournaments", headers=auth(forged))
    assert r.status_code == 401


# --- create official ---

def test_duplicate_official_username_is_a_conflict(client, admin_token):
    """A clashing username must be a clean 409, not an unhandled 500."""
    assert _make_official(client, admin_token, "dup-user").status_code == 200
    r = _make_official(client, admin_token, "dup-user")
    assert r.status_code == 409, r.text


def test_organizer_cannot_create_officials(client, organizer_token):
    r = _make_official(client, organizer_token, "sneaky-official")
    assert r.status_code == 403
