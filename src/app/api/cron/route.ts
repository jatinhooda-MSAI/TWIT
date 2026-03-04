import { NextResponse } from "next/server";
import { ingestLatestNews } from "@/lib/ingest";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a, "utf-8"), Buffer.from(b, "utf-8"));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  // Verify cron secret (timing-safe comparison)
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;

  if (!authHeader || !safeCompare(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestLatestNews();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
