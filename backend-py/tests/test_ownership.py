"""Tournaments belong to their creators.

Only the organizer who created a tournament (or an admin) may modify it —
another organizer gets 403 everywhere. /api/my/tournaments lists only your own.
"""
import psycopg
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client(migrated_db):
    import os
    os.environ["DATABASE_URL"] = migrated_db
    os.environ["JWT_SECRET"] = "test-secret-0123456789abcdef0123456789abcdef"
    from app.main import app
    with TestClient(app) as c:
        yield c


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def login(client, username, password="admin12345"):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(client):
    return login(client, "admin")


@pytest.fixture(scope="session")
def org_a(client):
    return login(client, "organizer")


@pytest.fixture(scope="session")
def org_b(client, admin_token):
    client.post("/api/officials", headers=auth(admin_token), json={
        "first_name": "Second", "last_name": "Organizer", "title": "NA",
        "username": "org-b", "password": "orgbpass123",
    })
    return login(client, "org-b", "orgbpass123")


def make_tournament(client, token, slug):
    r = client.post("/api/tournaments", headers=auth(token), json={
        "name": slug, "slug": slug, "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-03-01",
        "end_date": "2026-03-05", "rounds": 3,
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


@pytest.fixture(scope="session")
def a_tournament(client, org_a):
    return make_tournament(client, org_a, "owned-by-a")


def test_creating_sets_the_owner(client, org_a, a_tournament, migrated_db):
    with psycopg.connect(migrated_db) as db:
        owner = db.execute(
            "SELECT u.username FROM tournaments t JOIN users u ON u.id = t.owner_user_id "
            "WHERE t.id = %s", (a_tournament,),
        ).fetchone()
    assert owner == ("organizer",)


def test_another_organizer_cannot_edit_it(client, org_b, a_tournament):
    r = client.put(f"/api/tournaments/{a_tournament}", headers=auth(org_b), json={
        "name": "Hijacked", "slug": "owned-by-a", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-03-01",
        "end_date": "2026-03-05", "rounds": 3,
    })
    assert r.status_code == 403


@pytest.mark.parametrize("method,path,body", [
    ("post", "/api/tournaments/{tid}/players", {"player_id": "x"}),
    ("post", "/api/tournaments/{tid}/players/bulk", {"ids": "x"}),
    ("delete", "/api/tournaments/{tid}/players/x", None),
    ("post", "/api/tournaments/{tid}/players/sync-ranks", {}),
    ("post", "/api/tournaments/{tid}/withdraw/x", {}),
    ("post", "/api/tournaments/{tid}/generate-round", {}),
    ("post", "/api/tournaments/{tid}/finalize", {}),
])
def test_every_tournament_mutation_is_owner_only(
    client, org_b, a_tournament, method, path, body
):
    url = path.format(tid=a_tournament)
    fn = getattr(client, method)
    r = fn(url, headers=auth(org_b)) if body is None else fn(
        url, headers=auth(org_b), json=body
    )
    assert r.status_code == 403, f"{method} {url} allowed a non-owner: {r.status_code}"


def test_round_and_pairing_mutations_are_owner_only(
    client, admin_token, org_a, org_b, a_tournament, migrated_db
):
    # owner registers players and generates a round
    for i in range(1, 5):
        client.post("/api/players", headers=auth(admin_token), json={
            "id": f"OWN-{i}", "first_name": f"O{i}", "last_name": "Owner",
            "federation_id": "KAZ", "rating_classic": 1600 - i,
        })
    client.post(f"/api/tournaments/{a_tournament}/players/bulk",
                headers=auth(org_a), json={"ids": "OWN-1,OWN-2,OWN-3,OWN-4"})
    r = client.post(f"/api/tournaments/{a_tournament}/generate-round",
                    headers=auth(org_a))
    assert r.status_code == 200, r.text
    rid = r.json()["round_id"]
    with psycopg.connect(migrated_db) as db:
        pid = db.execute(
            "SELECT id FROM pairings WHERE round_id = %s LIMIT 1", (rid,)
        ).fetchone()[0]

    b = auth(org_b)
    assert client.post(f"/api/rounds/{rid}/results", headers=b,
                       json={"results": []}).status_code == 403
    assert client.put(f"/api/rounds/{rid}/pairings", headers=b,
                      json={"pairings": []}).status_code == 403
    assert client.delete(f"/api/rounds/{rid}/pairings", headers=b).status_code == 403
    assert client.post(f"/api/pairings/{pid}/result", headers=b,
                       json={"result": "1-0"}).status_code == 403
    assert client.delete(f"/api/pairings/{pid}/result", headers=b).status_code == 403
    assert client.post(f"/api/tournaments/{a_tournament}/rounds/{rid}/close",
                       headers=b).status_code == 403

    # the owner is still allowed
    assert client.post(f"/api/pairings/{pid}/result", headers=auth(org_a),
                       json={"result": "1-0"}).status_code == 200


def test_admin_may_modify_anyones_tournament(client, admin_token, a_tournament):
    r = client.put(f"/api/tournaments/{a_tournament}", headers=auth(admin_token), json={
        "name": "owned-by-a (admin touch)", "slug": "owned-by-a",
        "federation_id": "KAZ", "location_id": "Astana",
        "rating_type_id": "Classic", "tournament_type_id": "Swiss",
        "start_date": "2026-03-01", "end_date": "2026-03-05", "rounds": 3,
    })
    assert r.status_code == 200, r.text


def test_my_tournaments_lists_only_mine(client, org_a, org_b, a_tournament):
    make_tournament(client, org_b, "owned-by-b")

    mine_a = client.get("/api/my/tournaments", headers=auth(org_a)).json()
    mine_b = client.get("/api/my/tournaments", headers=auth(org_b)).json()
    slugs_a = {t["slug"] for t in mine_a}
    slugs_b = {t["slug"] for t in mine_b}
    assert "owned-by-a" in slugs_a and "owned-by-b" not in slugs_a
    assert "owned-by-b" in slugs_b and "owned-by-a" not in slugs_b


def test_admin_sees_every_tournament(client, admin_token):
    slugs = {t["slug"] for t in
             client.get("/api/my/tournaments", headers=auth(admin_token)).json()}
    assert {"owned-by-a", "owned-by-b"} <= slugs


def test_legacy_ownerless_tournament_is_admin_only(
    client, admin_token, org_a, migrated_db
):
    with psycopg.connect(migrated_db) as db:
        tid = db.execute(
            """INSERT INTO tournaments (name, slug, federation_id, location_id,
                   rating_type_id, tournament_type_id, start_date, end_date, rounds)
               VALUES ('Legacy', 'legacy-no-owner', 'KAZ', 'Astana', 'Classic',
                       'Swiss', '2026-02-01', '2026-02-03', 3) RETURNING id"""
        ).fetchone()[0]
        db.commit()
    r = client.post(f"/api/tournaments/{tid}/players/sync-ranks", headers=auth(org_a))
    assert r.status_code == 403, "an ownerless tournament must not be editable by all"
    r = client.post(f"/api/tournaments/{tid}/players/sync-ranks",
                    headers=auth(admin_token))
    assert r.status_code == 200
