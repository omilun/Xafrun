const BASE = '';

export async function reconcile(kind: string, namespace: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/api/reconcile/${kind.toLowerCase()}/${namespace}/${name}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Reconcile failed: ${res.statusText}`);
}

export async function suspend(kind: string, namespace: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/api/suspend/${kind.toLowerCase()}/${namespace}/${name}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Suspend failed: ${res.statusText}`);
}

export async function resume(kind: string, namespace: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/api/resume/${kind.toLowerCase()}/${namespace}/${name}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Resume failed: ${res.statusText}`);
}
