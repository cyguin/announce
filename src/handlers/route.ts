import { NextRequest, NextResponse } from 'next/server';
import { createAnnounceHandler } from '../api/handler.js';
import type { AnnounceAdapter } from '../types.js';

interface RouteHandlerOptions {
  secret?: string;
}

function requireAdmin(req: NextRequest, secret?: string): NextResponse | null {
  if (!secret) {
    return NextResponse.json({ error: 'Announce secret is not configured' }, { status: 500 });
  }

  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function createRouteHandler(adapter: AnnounceAdapter, options?: RouteHandlerOptions) {
  const handler = createAnnounceHandler({ adapter, options });
  const secret = options?.secret;

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
          const authError = requireAdmin(req, secret);
          if (authError) return authError;

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
        const authError = requireAdmin(req, secret);
        if (authError) return authError;

        const id = url.searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'id query param required' }, { status: 400 });
        }
        await adapter.remove(id);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    } catch (err) {
      console.error('Announce route handler error:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
