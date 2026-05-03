const BASE = '/api/proxy';

export async function reconcile(kind: string, namespace: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/reconcile/${kind.toLowerCase()}/${namespace}/${name}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Reconcile failed: ${res.statusText}`);
}

export async function suspend(kind: string, namespace: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/suspend/${kind.toLowerCase()}/${namespace}/${name}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Suspend failed: ${res.statusText}`);
}

export async function resume(kind: string, namespace: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/resume/${kind.toLowerCase()}/${namespace}/${name}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Resume failed: ${res.statusText}`);
}

export async function fetchYaml(kind: string, namespace: string, name: string): Promise<string> {
  const res = await fetch(`${BASE}/yaml/${kind.toLowerCase()}/${namespace}/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch YAML: ${res.statusText}`);
  const data = await res.json();
  return data.yaml ?? '';
}

export async function fetchK8sEvents(kind: string, namespace: string, name: string) {
  const res = await fetch(`${BASE}/k8sevents/${kind.toLowerCase()}/${namespace}/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
  return res.json();
}

export async function fetchDiff(kind: string, namespace: string, name: string): Promise<{ live: string; desired: string }> {
  const res = await fetch(`${BASE}/diff/${kind.toLowerCase()}/${namespace}/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch diff: ${res.statusText}`);
  return res.json();
}
