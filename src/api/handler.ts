import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../auth.js';
import type { CreateAnnouncementInput, AnnounceAdapter } from '../types.js';

interface HandlerOptions {
  adapter: AnnounceAdapter;
  options?: {
    defaultActiveDays?: number;
    maxActive?: number;
    secret?: string;
  };
}

function getRouteSegments(req: NextRequest): { remaining: string[]; url: URL } {
  const url = req.nextUrl.clone();
  const segments = url.pathname.split('/').filter(Boolean);
  const cyguinIndex = segments.indexOf('cyguin');
  const remaining = cyguinIndex === -1 ? [] : segments.slice(cyguinIndex + 1);
  return { remaining, url };
}

async function handleGet(req: NextRequest, adapter: AnnounceAdapter): Promise<NextResponse> {
  const { remaining, url } = getRouteSegments(req);
  if (remaining.length !== 1) {
    return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
  }
  const userId = url.searchParams.get('userId') ?? undefined;
  const announcements = await adapter.listActive(userId);
  return NextResponse.json({ announcements });
}

async function handleCreate(req: NextRequest, adapter: AnnounceAdapter, secret: string | undefined, defaultActiveDays: number): Promise<NextResponse> {
  const authError = requireAdmin(req, secret);
  if (authError) return authError;

  const body = await req.json() as CreateAnnouncementInput;
  if (!body.title || !body.body) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }

  const now = Date.now();
  const announcement = await adapter.create({
    title: body.title,
    body: body.body,
    active_from: body.active_from ?? now,
    active_until: body.active_until ?? (now + defaultActiveDays * 24 * 60 * 60 * 1000),
  });
  return NextResponse.json({ announcement }, { status: 201 });
}

async function handleDismiss(req: NextRequest, adapter: AnnounceAdapter): Promise<NextResponse> {
  const { remaining, url } = getRouteSegments(req);
  if (remaining.length !== 2 || remaining[1] !== 'dismiss') {
    return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
  }
  const userId = url.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
  }
  await adapter.dismiss(remaining[0], userId);
  return NextResponse.json({ success: true });
}

async function handleDelete(req: NextRequest, adapter: AnnounceAdapter, secret: string | undefined): Promise<NextResponse> {
  const { remaining, url } = getRouteSegments(req);

  if (remaining.length === 2 && remaining[1] === 'dismiss') {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
    }
    await adapter.dismiss(remaining[0], userId);
    return NextResponse.json({ success: true });
  }

  if (remaining.length === 1) {
    const authError = requireAdmin(req, secret);
    if (authError) return authError;
    await adapter.remove(remaining[0]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
}

export function createAnnounceHandler({ adapter, options = {} }: HandlerOptions) {
  const { defaultActiveDays = 7, secret } = options;

  return async function handler(req: NextRequest): Promise<NextResponse> {
    try {
      switch (req.method) {
        case 'GET':
          return handleGet(req, adapter);
        case 'POST': {
          const { remaining } = getRouteSegments(req);
          if (remaining.length === 2 && remaining[1] === 'dismiss') {
            return handleDismiss(req, adapter);
          }
          return handleCreate(req, adapter, secret, defaultActiveDays);
        }
        case 'DELETE':
          return handleDelete(req, adapter, secret);
        default:
          return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
      }
    } catch (err) {
      console.error('Announce handler error:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
