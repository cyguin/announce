# DEV_LOG.md — @cyguin/announce

## Slice Status

### Slice 1 — Admin API + Adapters ✅ DONE
- [x] `src/types.ts` — `Announcement`, `CreateAnnouncementInput`, `AnnounceAdapter` interface
- [x] `src/adapters/sqlite.ts` — `createSQLiteAdapter` implementing `AnnounceAdapter`
- [x] `src/adapters/postgres.ts` — `createPostgresAdapter` implementing `AnnounceAdapter`
- [x] `src/handlers/route.ts` — Next.js App Router catch-all route handler factory
- [x] `src/index.ts` — Re-exports types, adapters, and handlers
- [x] Build passes (`npm run build`)

### Slice 2 — Banner Component (pending)
- [ ] `<AnnouncementBanner />` component with `--cyguin-*` theming
- [ ] Per-user dismiss state
- [ ] Auto-expiry based on `active_until`
- [ ] README with drop-in example

## Notes

### Slice 1 Completions
- Types: `Announcement`, `CreateAnnouncementInput`, `AnnounceAdapter` exported from `src/types.ts`
- Adapters: `createSQLiteAdapter(db)`, `createPostgresAdapter(pool)` implement full `AnnounceAdapter` interface
  - `listActive(userId?)` — lists non-expired, non-dismissed announcements
  - `create(input)` — creates with nanoid, returns full Announcement
  - `remove(id)` — deletes announcement and its dismissals
  - `dismiss(announcementId, userId)` — upserts dismissal record
  - `isDismissed(announcementId, userId)` — checks dismissal status
- Route handler: `createRouteHandler(adapter)` factory for Next.js App Router
- Exports added for `./handlers` entry point

### API Endpoints (via createRouteHandler)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/announce/cyguin?userId=xxx` | List active announcements |
| POST | `/api/announce/cyguin` | Create announcement |
| POST | `/api/announce/cyguin/dismiss` | Dismiss announcement (body: `{announcementId, userId}`) |
| DELETE | `/api/announce/cyguin?id=xxx` | Delete announcement |

---

*Last updated: 2026-04-05*
