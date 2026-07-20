import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Invalidates cached tournament data after an organizer write, so spectators
 * see the result immediately instead of waiting out the SWR window.
 *
 * Called fire-and-forget from the browser (see src/lib/api.ts), so it cannot
 * carry a secret; safety comes from a same-origin check and a strict tag
 * whitelist — the worst a stranger could do is cause a cache miss.
 */
const ALLOWED_TAG = /^(tournaments|players|lookups|tournament-\d+)$/;

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let tags: unknown;
  try {
    tags = (await req.json()).tags;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > 10) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const applied: string[] = [];
  for (const tag of tags) {
    if (typeof tag === "string" && ALLOWED_TAG.test(tag)) {
      // 'max' = stale-while-revalidate: the next visit serves stale content
      // and refreshes in the background, so the DB is never hit in a burst
      revalidateTag(tag, "max");
      applied.push(tag);
    }
  }
  return NextResponse.json({ revalidated: applied });
}
