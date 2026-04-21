import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { createAnnounceHandler } from './handler';
import type { AnnounceAdapter } from '../types';

function adapter(): AnnounceAdapter {
  return {
    listActive: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: 'ann_1',
      title: 'Launch',
      body: 'cyguin shipped.',
      active_from: Date.now(),
      active_until: Date.now() + 1000,
      created_at: Date.now(),
    }),
    remove: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    isDismissed: vi.fn().mockResolvedValue(false),
  };
}

describe('createAnnounceHandler auth', () => {
  it('fails closed for announcement creation without a secret', async () => {
    const announceAdapter = adapter();
    const handler = createAnnounceHandler({ adapter: announceAdapter });

    const response = await handler(
      new NextRequest('https://example.com/api/cyguin/announcements', {
        method: 'POST',
        body: JSON.stringify({ title: 'Launch', body: 'cyguin shipped.' }),
      })
    );

    expect(response.status).toBe(500);
    expect(announceAdapter.create).not.toHaveBeenCalled();
  });

  it('keeps public dismiss available without an admin secret', async () => {
    const announceAdapter = adapter();
    const handler = createAnnounceHandler({ adapter: announceAdapter });

    const response = await handler(
      new NextRequest('https://example.com/api/cyguin/ann_1/dismiss?userId=user_1', {
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
    expect(announceAdapter.dismiss).toHaveBeenCalledWith('ann_1', 'user_1');
  });
});
