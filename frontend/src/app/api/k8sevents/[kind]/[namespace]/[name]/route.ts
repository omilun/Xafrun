import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string; namespace: string; name: string }> }
) {
  const { kind, namespace, name } = await params;
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/k8sevents/${kind}/${namespace}/${name}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
