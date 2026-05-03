import { NextRequest, NextResponse } from 'next/server';

/**
 * Intelligent Backend Discovery.
 * 1. Explicit env var.
 * 2. In-cluster service name.
 * 3. Localhost fallback.
 */
const getBackendUrl = () => {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  // If we are in a K8s pod, this should usually resolve.
  if (process.env.NODE_ENV === 'production') return 'http://xafrun-backend:8080';
  return 'http://localhost:8080';
};

const BACKEND_URL = getBackendUrl();

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

async function proxy(req: NextRequest, { path }: { path: string[] }) {
  const subPath = path.join('/');
  // Next.js doesn't include the 'api' part in [...path] if the route is /api/proxy
  const targetUrl = `${BACKEND_URL}/api/${subPath}${req.nextUrl.search}`;

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? await req.text() : undefined,
      cache: 'no-store',
      // In a cluster, we might want to increase the timeout
      signal: AbortSignal.timeout(10000), 
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
      { error: 'Backend unreachable', url: targetUrl, detail: String(err) },
      { status: 502 }
    );
  }
}
