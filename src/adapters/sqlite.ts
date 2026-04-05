import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { Announcement, CreateAnnouncementInput, AnnounceAdapter } from '../types.js';

export function createSQLiteAdapter(db: Database.Database): AnnounceAdapter {
  return {
    async listActive(userId?: string): Promise<Announcement[]> {
      const now = Date.now();
      const stmt = db.prepare(`
        SELECT * FROM announcements
        WHERE (active_from IS NULL OR active_from <= ?)
        AND (active_until IS NULL OR active_until >= ?)
        ORDER BY created_at DESC
      `);
      const announcements = stmt.all(now, now) as Announcement[];

      if (!userId) return announcements;

      const dismissedStmt = db.prepare(`
        SELECT announcement_id FROM announcement_dismissals WHERE user_id = ?
      `);
      const dismissed = dismissedStmt.all(userId) as { announcement_id: string }[];
      const dismissedIds = new Set(dismissed.map(d => d.announcement_id));

      return announcements.filter(a => !dismissedIds.has(a.id));
    },

    async create(input: CreateAnnouncementInput): Promise<Announcement> {
      const id = nanoid();
      const created_at = Date.now();
      const stmt = db.prepare(`
        INSERT INTO announcements (id, title, body, active_from, active_until, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        input.title,
        input.body,
        input.active_from ?? null,
        input.active_until ?? null,
        created_at
      );
      return { id, ...input, active_from: input.active_from ?? null, active_until: input.active_until ?? null, created_at };
    },

    async remove(id: string): Promise<void> {
      const stmt = db.prepare('DELETE FROM announcements WHERE id = ?');
      stmt.run(id);
      const dismissalsStmt = db.prepare('DELETE FROM announcement_dismissals WHERE announcement_id = ?');
      dismissalsStmt.run(id);
    },

    async dismiss(announcementId: string, userId: string): Promise<void> {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO announcement_dismissals (user_id, announcement_id, dismissed_at)
        VALUES (?, ?, ?)
      `);
      stmt.run(userId, announcementId, Date.now());
    },

    async isDismissed(announcementId: string, userId: string): Promise<boolean> {
      const stmt = db.prepare(`
        SELECT 1 FROM announcement_dismissals WHERE user_id = ? AND announcement_id = ?
      `);
      const result = stmt.get(userId, announcementId);
      return !!result;
    },
  };
}
