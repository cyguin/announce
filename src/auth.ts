import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export function requireAdmin(req: NextRequest, secret?: string): NextResponse | null {
  if (!secret) {
    return NextResponse.json({ error: 'Announce secret is not configured' }, { status: 500 });
  }

  const auth = req.headers.get('authorization');
  const expected = `Bearer ${secret}`;
  if (!auth || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
