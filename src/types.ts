export interface Announcement {
  id: string;
  title: string;
  body: string;
  active_from: number | null;
  active_until: number | null;
  created_at: number;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  active_from?: number;
  active_until?: number;
}

export interface AnnounceAdapter {
  listActive(userId?: string): Promise<Announcement[]>;
  create(input: CreateAnnouncementInput): Promise<Announcement>;
  remove(id: string): Promise<void>;
  dismiss(announcementId: string, userId: string): Promise<void>;
  isDismissed(announcementId: string, userId: string): Promise<boolean>;
}

export class AnnounceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnnounceError';
  }
}
