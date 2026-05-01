import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string; namespace: string; name: string }> }
) {
  const { kind, namespace, name } = await params;
  return NextResponse.json(
    { error: `YAML inspection for ${kind}/${namespace}/${name} coming in next release` },
    { status: 501 }
  );
}
