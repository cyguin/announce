import { NextRequest, NextResponse } from 'next/server';
import { Announcement, CreateAnnouncementInput, AnnounceAdapter, AnnounceError } from '../types.js';

interface HandlerOptions {
  adapter: AnnounceAdapter;
  options?: {
    defaultActiveDays?: number;
    maxActive?: number;
  };
}

function parseJsonBody<T>(req: NextRequest): Promise<T> {
  return req.json();
}

export function createAnnounceHandler({ adapter, options = {} }: HandlerOptions) {
  const { defaultActiveDays = 7, maxActive = 3 } = options;

  return async function handler(req: NextRequest) {
    const url = req.nextUrl.clone();
    const segments = url.pathname.split('/').filter(Boolean);
    const cyguinIndex = segments.indexOf('cyguin');

    if (cyguinIndex === -1) {
      return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
    }

    const remaining = segments.slice(cyguinIndex + 1);

    try {
      if (req.method === 'GET') {
        if (remaining.length === 1) {
          const userId = url.searchParams.get('userId') ?? undefined;
          const announcements = await adapter.listActive(userId);
          return NextResponse.json({ announcements });
        }
        return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
      }

      if (req.method === 'POST') {
        if (remaining.length === 1) {
          const body = await parseJsonBody<CreateAnnouncementInput>(req);
          if (!body.title || !body.body) {
            return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
          }
          const now = Date.now();
          const activeFrom = body.active_from ?? now;
          const activeUntil = body.active_until ?? (now + defaultActiveDays * 24 * 60 * 60 * 1000);
          const announcement = await adapter.create({
            title: body.title,
            body: body.body,
            active_from: activeFrom,
            active_until: activeUntil,
          });
          return NextResponse.json({ announcement }, { status: 201 });
        }

        if (remaining.length === 2 && remaining[1] === 'dismiss') {
          const announcementId = remaining[0];
          const userId = url.searchParams.get('userId');
          if (!userId) {
            return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
          }
          await adapter.dismiss(announcementId, userId);
          return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
      }

      if (req.method === 'DELETE') {
        if (remaining.length === 2 && remaining[1] === 'dismiss') {
          const announcementId = remaining[0];
          const userId = url.searchParams.get('userId');
          if (!userId) {
            return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
          }
          await adapter.dismiss(announcementId, userId);
          return NextResponse.json({ success: true });
        }
        if (remaining.length === 1) {
          const id = remaining[0];
          await adapter.remove(id);
          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
      }

      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
