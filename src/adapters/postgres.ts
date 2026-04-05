import { nanoid } from 'nanoid';
import { Announcement, CreateAnnouncementInput, AnnounceAdapter } from '../types.js';

export function createPostgresAdapter(pool: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }): AnnounceAdapter {
  return {
    async listActive(userId?: string): Promise<Announcement[]> {
      const now = Date.now();
      const result = await pool.query(`
        SELECT * FROM announcements
        WHERE (active_from IS NULL OR active_from <= $1)
        AND (active_until IS NULL OR active_until >= $1)
        ORDER BY created_at DESC
      `, [now]);
      const announcements = result.rows as Announcement[];

      if (!userId) return announcements;

      const dismissedResult = await pool.query(`
        SELECT announcement_id FROM announcement_dismissals WHERE user_id = $1
      `, [userId]);
      const dismissedIds = new Set((dismissedResult.rows as { announcement_id: string }[]).map(d => d.announcement_id));

      return announcements.filter(a => !dismissedIds.has(a.id));
    },

    async create(input: CreateAnnouncementInput): Promise<Announcement> {
      const id = nanoid();
      const created_at = Date.now();
      const result = await pool.query(`
        INSERT INTO announcements (id, title, body, active_from, active_until, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [id, input.title, input.body, input.active_from ?? null, input.active_until ?? null, created_at]);
      return result.rows[0] as Announcement;
    },

    async remove(id: string): Promise<void> {
      await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
      await pool.query('DELETE FROM announcement_dismissals WHERE announcement_id = $1', [id]);
    },

    async dismiss(announcementId: string, userId: string): Promise<void> {
      await pool.query(`
        INSERT INTO announcement_dismissals (user_id, announcement_id, dismissed_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, announcement_id) DO UPDATE SET dismissed_at = $3
      `, [userId, announcementId, Date.now()]);
    },

    async isDismissed(announcementId: string, userId: string): Promise<boolean> {
      const result = await pool.query(`
        SELECT 1 FROM announcement_dismissals WHERE user_id = $1 AND announcement_id = $2
      `, [userId, announcementId]);
      return (result.rows as { date: unknown }[]).length > 0;
    },
  };
}
