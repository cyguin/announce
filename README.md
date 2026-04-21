# @cyguin/announce

DB-backed, per-user dismissible announcement banner for Next.js apps.

## Install

```bash
npm install @cyguin/announce
```

## Setup

### 1. Create the API route

Create `app/api/announce/[...cyguin]/route.ts` in your Next.js app:

```ts
import { createAnnounceHandler } from '@cyguin/announce/next';
import Database from 'better-sqlite3';
import { createSQLiteAdapter } from '@cyguin/announce/adapters/sqlite';

const db = new Database('announce.db');
db.pragma('journal_mode = WAL');
const adapter = createSQLiteAdapter(db);

const handler = createAnnounceHandler({
  adapter,
  options: {
    secret: process.env.ANNOUNCE_SECRET,
  },
});

export { handler as GET, handler as POST, handler as DELETE };
```

### 2. Run migrations

```sql
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  active_from INTEGER,
  active_until INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS announcement_dismissals (
  user_id TEXT NOT NULL,
  announcement_id TEXT NOT NULL,
  dismissed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, announcement_id)
);
```

### 3. Set the admin API secret

```bash
ANNOUNCE_SECRET=change-me
```

Creating and deleting announcements requires `Authorization: Bearer $ANNOUNCE_SECRET`. Listing active announcements and user dismissals remain public widget actions.

### 4. Add the banner

```tsx
import { AnnouncementBanner } from '@cyguin/announce/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBanner
        apiBase="/api/announce"
        userId={currentUser.id}
        theme="dark"
      />
      {children}
    </>
  );
}
```

## Postgres Setup

```ts
import { createAnnounceHandler } from '@cyguin/announce/next';
import postgres from 'postgres';
import { createPostgresAdapter } from '@cyguin/announce/adapters/postgres';

const sql = postgres(process.env.DATABASE_URL!);
const adapter = createPostgresAdapter(sql);

const handler = createAnnounceHandler({
  adapter,
  options: {
    secret: process.env.ANNOUNCE_SECRET,
  },
});

export { handler as GET, handler as POST, handler as DELETE };
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/announce/cyguin?userId=xxx` | List active announcements for user |
| POST | `/api/announce/cyguin` | Create announcement (requires Bearer token) |
| DELETE | `/api/announce/cyguin/:id` | Delete announcement (requires Bearer token) |
| POST | `/api/announce/cyguin/:id/dismiss?userId=xxx` | Dismiss for user |

## Theming

`AnnouncementBanner` defaults to the cyguin dark theme. Pass `theme="light"` to opt into the light theme.

Use `--cyguin-*` CSS custom properties on `.cyguin-announce-banner`:

```css
.cyguin-announce-banner {
  --cyguin-bg: #ffffff;
  --cyguin-fg: #0a0a0a;
  --cyguin-accent: #f5a800;
  --cyguin-border: #e5e5e5;
  --cyguin-radius: 6px;
  --cyguin-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
```

Switch to light theme with the `theme` prop:

```tsx
<AnnouncementBanner theme="light" ... />
```

Dark theme applies these overrides automatically:

```css
--cyguin-bg: #0a0a0a;
--cyguin-bg-subtle: #1a1a1a;
--cyguin-border: #2a2a2a;
--cyguin-fg: #f5f5f5;
--cyguin-shadow: 0 1px 4px rgba(0,0,0,0.4);
```

## Configuration

```ts
createAnnounceHandler({
  adapter,
  options: {
    defaultActiveDays: 7,  // auto-expire after N days
    maxActive: 3,         // max simultaneous active announcements
    secret: process.env.ANNOUNCE_SECRET,
  },
})
```

## License

MIT
