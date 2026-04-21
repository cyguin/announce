'use client';

import React, { useEffect, useState } from 'react';
import { Announcement } from '../types.js';

interface AnnouncementBannerProps {
  apiBase?: string;
  userId?: string;
  theme?: 'light' | 'dark';
  className?: string;
  onDismiss?: (id: string) => void;
}

interface FetchedData {
  announcements: Announcement[];
}

export function AnnouncementBanner({
  apiBase = '/api/announce',
  userId,
  theme = 'dark',
  className = '',
  onDismiss,
}: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const url = userId
          ? `${apiBase}/cyguin?userId=${encodeURIComponent(userId)}`
          : `${apiBase}/cyguin`;
        const res = await fetch(url);
        const data: FetchedData = await res.json();
        setAnnouncements(data.announcements ?? []);
      } catch (err) {
        console.error('[AnnouncementBanner] fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncements();
  }, [apiBase, userId]);

  const handleDismiss = async (id: string) => {
    if (!userId) {
      setDismissed(prev => new Set([...prev, id]));
      onDismiss?.(id);
      return;
    }
    try {
      const url = `${apiBase}/cyguin/${id}/dismiss?userId=${encodeURIComponent(userId)}`;
      await fetch(url, { method: 'POST' });
      setDismissed(prev => new Set([...prev, id]));
      onDismiss?.(id);
    } catch (err) {
      console.error('[AnnouncementBanner] dismiss failed:', err);
    }
  };

  if (loading) return null;

  const now = Date.now();
  const visible = announcements.filter(a => {
    if (dismissed.has(a.id)) return false;
    if (a.active_from && now < a.active_from) return false;
    if (a.active_until && now > a.active_until) return false;
    return true;
  });

  if (visible.length === 0) return null;

  const announcement = visible[0];

  return (
    <>
      <style>{`
        @keyframes cyguin-announce-slide-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cyguin-announce-banner {
          --cyguin-bg: #ffffff;
          --cyguin-bg-subtle: #f1f3f6;
          --cyguin-border: #e5e5e5;
          --cyguin-fg: #0a0d17;
          --cyguin-fg-muted: #858b98;
          --cyguin-accent: #ffd21f;
          --cyguin-accent-dark: #e0a900;
          --cyguin-accent-fg: #0a0d17;
          --cyguin-radius: 6px;
          --cyguin-shadow: 0 1px 4px rgba(0,0,0,0.08);
          animation: cyguin-announce-slide-in 0.2s ease-out;
        }
        .cyguin-announce-banner[data-theme="dark"] {
          --cyguin-bg: #0a0d17;
          --cyguin-bg-subtle: #101521;
          --cyguin-border: #252b3a;
          --cyguin-fg: #f1f3f6;
          --cyguin-fg-muted: #858b98;
          --cyguin-shadow: 0 1px 4px rgba(0,0,0,0.32);
        }
        .cyguin-announce-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background-color: var(--cyguin-bg);
          color: var(--cyguin-fg);
          border: 1px solid var(--cyguin-border);
          border-radius: var(--cyguin-radius);
          box-shadow: var(--cyguin-shadow);
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          margin: 8px;
          gap: 12px;
        }
        .cyguin-announce-banner .announce-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .cyguin-announce-banner .announce-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--cyguin-fg);
        }
        .cyguin-announce-banner .announce-body {
          font-size: 13px;
          color: var(--cyguin-fg-muted);
        }
        .cyguin-announce-banner .announce-dismiss {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cyguin-fg-muted);
          transition: opacity 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .cyguin-announce-banner .announce-dismiss:hover {
          opacity: 0.8;
          color: var(--cyguin-fg);
        }
      `}</style>
      <div
        className={`cyguin-announce-banner ${className}`}
        data-theme={theme}
        role="banner"
        aria-live="polite"
      >
        <div className="announce-content">
          <span className="announce-title">{announcement.title}</span>
          <span className="announce-body">{announcement.body}</span>
        </div>
        <button
          className="announce-dismiss"
          onClick={() => handleDismiss(announcement.id)}
          aria-label="Dismiss announcement"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
    </>
  );
}
