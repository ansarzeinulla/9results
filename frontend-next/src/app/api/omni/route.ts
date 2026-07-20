import { NextRequest, NextResponse } from "next/server";
import { omniSearch } from "@/lib/data";

/** Local-dev fallback for the omni-search (production talks to Supabase RPC
 * directly from the browser). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  return NextResponse.json(await omniSearch(q, 8));
}
