import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';

/**
 * Robust Catch-All Proxy for Xafrun.
 * Proxies any request from /api/proxy/* to the Go backend.
 * Example: /api/proxy/tree -> http://backend:8080/api/tree
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

async function proxy(req: NextRequest, { path }: { path: string[] }) {
  const subPath = path.join('/');
  const targetUrl = `${BACKEND_URL}/api/${subPath}${req.nextUrl.search}`;

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? await req.text() : undefined,
      cache: 'no-store',
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const body = await res.text();
    return new NextResponse(body, { status: res.status });
  } catch (err) {
    console.error(`[Proxy Error] Failed to reach ${targetUrl}:`, err);
    return NextResponse.json(
      { error: 'Backend unreachable', detail: String(err) },
      { status: 502 }
    );
  }
}
