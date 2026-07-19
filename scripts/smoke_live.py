#!/usr/bin/env python3
"""Read-only smoke test of the live deployment (Vercel + Render + Supabase).

Checks that every public page renders, that the API is up with the expected
routes and CORS, and that authentication and the role split behave — without
writing anything to the production database.

    python3 scripts/smoke_live.py
    python3 scripts/smoke_live.py --password '<admin password>'   # adds auth checks
"""
import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

SITE = "https://9results.vercel.app"
API = "https://nineresults-api.onrender.com"

results: list[tuple[bool, str]] = []


def check(ok: bool, label: str, detail: str = "") -> bool:
    results.append((ok, label))
    print(f"{'PASS' if ok else 'FAIL'}  {label}{'  ' + detail if detail else ''}")
    return ok


def request(url, method="GET", body=None, headers=None, timeout=90):
    req = urllib.request.Request(url, method=method, headers=headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data=data, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace"), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), dict(e.headers)
    except Exception as e:  # network/timeout
        return 0, str(e), {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--password", help="admin password, enables auth checks")
    args = ap.parse_args()

    print("=== API ===")
    status, body, _ = request(f"{API}/api/health")
    check(status == 200, "API health", f"({status})")

    status, body, _ = request(f"{API}/openapi.json")
    routes = set()
    if status == 200:
        routes = set(json.loads(body).get("paths", {}))
    check("/api/players/{player_id}" in routes,
          "admin player lookup/edit route deployed")
    check("/api/tournaments/{tid}/generate-round" in routes,
          "pairing route deployed")

    _, _, headers = request(
        f"{API}/api/health", headers={"Origin": SITE}
    )
    check(headers.get("access-control-allow-origin") == SITE,
          "CORS allows the site origin",
          f"({headers.get('access-control-allow-origin')})")

    print("\n=== auth ===")
    status, _, _ = request(f"{API}/api/tournaments", method="POST", body={})
    check(status in (401, 403), "anonymous cannot create a tournament", f"({status})")
    status, _, _ = request(f"{API}/api/players", method="POST", body={})
    check(status in (401, 403), "anonymous cannot create a player", f"({status})")

    if args.password:
        status, body, _ = request(f"{API}/api/auth/login", method="POST",
                                  body={"username": "admin", "password": args.password})
        if check(status == 200, "admin can log in", f"({status})"):
            token = json.loads(body)["token"]
            auth = {"Authorization": f"Bearer {token}"}
            status, _, _ = request(f"{API}/api/players/__does_not_exist__", headers=auth)
            check(status == 404, "admin player lookup answers", f"({status})")

        status, body, _ = request(f"{API}/api/auth/login", method="POST",
                                  body={"username": "admin", "password": "wrong-password"})
        check(status == 401, "wrong password rejected", f"({status})")

    print("\n=== public pages ===")
    pages = ["/en", "/ru", "/kk", "/en/tournaments", "/en/players", "/en/login",
             "/ru/tournaments", "/kk/tournaments"]
    for path in pages:
        status, _, _ = request(f"{SITE}{path}")
        check(status == 200, f"page {path}", f"({status})")

    print("\n=== tournaments actually resolve ===")
    status, html, _ = request(f"{SITE}/en/tournaments")
    slugs = set()
    if status == 200:
        import re
        slugs = set(re.findall(r'href="/en/tournaments/([^"/]+)"', html))
    check(True, f"tournaments listed: {len(slugs)}")
    for slug in list(slugs)[:5]:
        # slugs may be non-Latin (Cyrillic/Kazakh names); percent-encode them
        encoded = urllib.parse.quote(urllib.parse.unquote(slug), safe="")
        for tab in ["", "/starting-rank", "/standings", "/pairings", "/alphabetical"]:
            status, _, _ = request(f"{SITE}/en/tournaments/{encoded}{tab}")
            check(status == 200,
                  f"  {urllib.parse.unquote(slug)}{tab or ' (info)'}", f"({status})")

    failed = [label for ok, label in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    if failed:
        print("failed:")
        for label in failed:
            print(" -", label)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
