import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string; namespace: string; name: string }> }
) {
  const { kind, namespace, name } = await params;
  const res = await fetch(`${BACKEND_URL}/api/resume/${kind}/${namespace}/${name}`, {
    method: 'POST',
    cache: 'no-store',
  });
  const body = await res.text();
  return new NextResponse(body, { status: res.status });
}
