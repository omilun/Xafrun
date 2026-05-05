import { NextRequest } from 'next/server';

const getBackendUrl = () => {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  if (process.env.NODE_ENV === 'production') return 'http://xafrun-backend:8080';
  return 'http://localhost:8080';
};

/**
 * SSE streaming proxy — bypasses the generic /api/proxy route which
 * buffers the body and has a 10-second AbortSignal timeout.
 * This route passes the raw ReadableStream straight back to the browser.
 */
export async function GET(req: NextRequest) {
  const backendUrl = `${getBackendUrl()}/api/events`;

  const clientAbort = new AbortController();
  req.signal.addEventListener('abort', () => clientAbort.abort());

  try {
    const backendRes = await fetch(backendUrl, {
      cache: 'no-store',
      signal: clientAbort.signal,
    });

    return new Response(backendRes.body, {
      status: backendRes.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }
    return new Response(JSON.stringify({ error: 'Backend unreachable', detail: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
