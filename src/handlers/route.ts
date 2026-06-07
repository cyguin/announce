import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../auth.js';
import type { AnnounceAdapter } from '../types.js';

interface RouteHandlerOptions {
  secret?: string;
}

export function createRouteHandler(adapter: AnnounceAdapter, options?: RouteHandlerOptions) {
  const secret = options?.secret;

  async function listActive(req: NextRequest): Promise<NextResponse> {
    const userId = req.nextUrl.searchParams.get('userId') ?? undefined;
    const announcements = await adapter.listActive(userId);
    return NextResponse.json({ announcements });
  }

  async function create(req: NextRequest): Promise<NextResponse> {
    const authError = requireAdmin(req, secret);
    if (authError) return authError;

    const body = await req.json();
    if (!body.title || !body.body) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
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

  async function dismiss(req: NextRequest): Promise<NextResponse> {
    const body = await req.json();
    if (!body.announcementId || !body.userId) {
      return NextResponse.json({ error: 'announcementId and userId are required' }, { status: 400 });
    }
    await adapter.dismiss(body.announcementId, body.userId);
    return NextResponse.json({ success: true });
  }

  async function remove(req: NextRequest): Promise<NextResponse> {
    const authError = requireAdmin(req, secret);
    if (authError) return authError;

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query param required' }, { status: 400 });
    }
    await adapter.remove(id);
    return NextResponse.json({ success: true });
  }

  return async function routeHandler(req: NextRequest): Promise<NextResponse> {
    try {
      switch (req.method) {
        case 'GET':
          return listActive(req);
        case 'POST':
          if (req.nextUrl.pathname.includes('/dismiss')) {
            return dismiss(req);
          }
          return create(req);
        case 'DELETE':
          return remove(req);
        default:
          return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
      }
    } catch (err) {
      console.error('Announce route handler error:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
