import { NextRequest, NextResponse } from 'next/server';
import { createAnnounceHandler } from '../api/handler.js';
import type { AnnounceAdapter } from '../types.js';

export function createRouteHandler(adapter: AnnounceAdapter) {
  const handler = createAnnounceHandler({ adapter });

  return async function routeHandler(req: NextRequest) {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const cyguinIndex = segments.indexOf('announce');

    if (cyguinIndex === -1) {
      return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
    }

    const remaining = segments.slice(cyguinIndex + 2);

    try {
      if (req.method === 'GET') {
        const userId = url.searchParams.get('userId') ?? undefined;
        const announcements = await adapter.listActive(userId);
        return NextResponse.json({ announcements });
      }

      if (req.method === 'POST') {
        if (remaining.length === 1 && remaining[0] === 'dismiss') {
          const body = await req.json();
          if (!body.announcementId || !body.userId) {
            return NextResponse.json(
              { error: 'announcementId and userId are required' },
              { status: 400 }
            );
          }
          await adapter.dismiss(body.announcementId, body.userId);
          return NextResponse.json({ success: true });
        }

        if (remaining.length === 0) {
          const body = await req.json();
          if (!body.title || !body.body) {
            return NextResponse.json(
              { error: 'title and body are required' },
              { status: 400 }
            );
          }
          const now = Date.now();
          const announcement = await adapter.create({
            title: body.title,
            body: body.body,
            active_from: body.active_from ?? now,
            active_until: body.active_until ?? now + 7 * 24 * 60 * 60 * 1000,
          });
          return NextResponse.json({ announcement }, { status: 201 });
        }

        return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
      }

      if (req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'id query param required' }, { status: 400 });
        }
        await adapter.remove(id);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
