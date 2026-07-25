"""Arbiter assignment (join table) and organizer federation inheritance."""
import psycopg

from tests.conftest import auth, make_tournament


def _an_official_id(migrated_db) -> int:
    with psycopg.connect(migrated_db) as db:
        return db.execute("SELECT id FROM officials ORDER BY id LIMIT 1").fetchone()[0]


def test_federation_inherited_from_organizer(client, organizer_token, migrated_db):
    tid = make_tournament(client, organizer_token, "fed-inherit-cup")
    with psycopg.connect(migrated_db) as db:
        fed = db.execute(
            "SELECT federation_id FROM tournaments WHERE id=%s", (tid,)
        ).fetchone()[0]
    # the seeded organizer's home federation is KAZ
    assert fed == "KAZ"


def test_arbiters_assigned_on_create(client, organizer_token, migrated_db):
    oid = _an_official_id(migrated_db)
    r = client.post("/api/tournaments", headers=auth(organizer_token), json={
        "name": "Arb Cup", "slug": "arb-cup", "location_id": "Astana",
        "rating_type_id": "Classic", "tournament_type_id": "Swiss",
        "start_date": "2026-05-01", "end_date": "2026-05-02",
        "arbiter_ids": [oid],
    })
    assert r.status_code == 200, r.text
    tid = r.json()["id"]
    with psycopg.connect(migrated_db) as db:
        rows = db.execute(
            "SELECT official_id FROM tournament_arbiters WHERE tournament_id=%s",
            (tid,),
        ).fetchall()
    assert [row[0] for row in rows] == [oid]


def test_unknown_arbiter_is_422(client, organizer_token):
    r = client.post("/api/tournaments", headers=auth(organizer_token), json={
        "name": "Bad Arb Cup", "slug": "bad-arb-cup", "location_id": "Astana",
        "rating_type_id": "Classic", "tournament_type_id": "Swiss",
        "start_date": "2026-05-01", "end_date": "2026-05-02",
        "arbiter_ids": [999999],
    })
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "UNKNOWN_ARBITER"
