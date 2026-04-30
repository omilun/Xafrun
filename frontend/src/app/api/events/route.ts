import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/**
 * Server-sent events proxy.
 * Streams the backend SSE connection to the browser.
 */
export async function GET(req: NextRequest) {
  const backendRes = await fetch(`${BACKEND_URL}/api/events`, {
    cache: "no-store",
    headers: { Accept: "text/event-stream" },
    // @ts-expect-error — Node 18+ fetch supports duplex streaming
    duplex: "half",
  });

  return new Response(backendRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export const dynamic = "force-dynamic";
