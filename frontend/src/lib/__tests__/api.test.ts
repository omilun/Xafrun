import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reconcile, suspend, resume } from '../api';

describe('api wrappers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reconcile calls POST /api/reconcile/:kind/:namespace/:name', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    await reconcile('Kustomization', 'apps', 'my-app');
    expect(fetch).toHaveBeenCalledWith('/api/reconcile/kustomization/apps/my-app', { method: 'POST' });
  });

  it('suspend calls POST /api/suspend/:kind/:namespace/:name', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    await suspend('HelmRelease', 'default', 'my-release');
    expect(fetch).toHaveBeenCalledWith('/api/suspend/helmrelease/default/my-release', { method: 'POST' });
  });

  it('resume calls POST /api/resume/:kind/:namespace/:name', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    await resume('GitRepository', 'flux-system', 'my-repo');
    expect(fetch).toHaveBeenCalledWith('/api/resume/gitrepository/flux-system/my-repo', { method: 'POST' });
  });

  it('reconcile throws on non-ok response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, statusText: 'Not Found' });
    await expect(reconcile('Kustomization', 'apps', 'my-app')).rejects.toThrow('Reconcile failed');
  });
});
