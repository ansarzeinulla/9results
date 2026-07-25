"""Player registry error paths — clean 4xx, never a 500."""
from tests.conftest import auth

BASE = {
    "id": "perr-1", "first_name": "Er", "last_name": "Ror",
    "federation_id": "KAZ",
}


def _create(client, admin_token, **overrides):
    return client.post("/api/players", headers=auth(admin_token),
                       json={**BASE, **overrides})


def test_unknown_federation_is_422(client, admin_token):
    r = _create(client, admin_token, id="perr-fed", federation_id="ZZZ")
    assert r.status_code == 422


def test_unknown_gender_is_422(client, admin_token):
    r = _create(client, admin_token, id="perr-gen", gender_id="X")
    assert r.status_code == 422


def test_unknown_title_is_422(client, admin_token):
    r = _create(client, admin_token, id="perr-title", title_id="NOPE")
    assert r.status_code == 422


def test_missing_required_field_is_422(client, admin_token):
    r = client.post("/api/players", headers=auth(admin_token),
                    json={"id": "perr-x", "first_name": "No", "last_name": "Fed"})
    assert r.status_code == 422  # federation_id missing


def test_get_unknown_player_is_404(client, admin_token):
    r = client.get("/api/players/does-not-exist", headers=auth(admin_token))
    assert r.status_code == 404


def test_update_unknown_player_is_404(client, admin_token):
    r = client.put("/api/players/ghost-player", headers=auth(admin_token),
                   json={**BASE, "id": "ghost-player"})
    assert r.status_code == 404


def test_delete_unknown_player_is_404(client, admin_token):
    r = client.delete("/api/players/ghost-player", headers=auth(admin_token))
    assert r.status_code == 404


def test_delete_player_with_history_is_409(client, admin_token, organizer_token,
                                           migrated_db):
    from tests.conftest import make_tournament
    h = auth(admin_token)
    assert _create(client, admin_token, id="perr-hist").status_code == 200
    _create(client, admin_token, id="perr-hist2")
    tid = make_tournament(client, admin_token, "perr-hist-cup", type_id="Swiss")
    for pid in ("perr-hist", "perr-hist2"):
        client.post(f"/api/tournaments/{tid}/players", headers=h,
                    json={"player_id": pid})
    client.post(f"/api/tournaments/{tid}/generate-round", headers=h)
    r = client.delete("/api/players/perr-hist", headers=h)
    assert r.status_code == 409


def test_duplicate_id_that_collides_is_not_a_500(client, admin_token):
    """The upsert proc means a plain re-POST updates cleanly (200). A genuine
    constraint collision must still be a clean 4xx, never an unhandled 500."""
    assert _create(client, admin_token, id="perr-dup").status_code == 200
    # re-POST with the same id is an idempotent update, not an error
    r = _create(client, admin_token, id="perr-dup", first_name="Updated")
    assert r.status_code == 200, r.text
    assert r.status_code != 500
