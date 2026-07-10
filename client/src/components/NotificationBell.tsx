import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api';
import type { AppNotification } from '../types';

const relativeTime = (iso: string): string => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/** Navbar notification bell: unread badge + dropdown of recent notifications. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  const readOne = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const openItem = (n: AppNotification) => {
    setOpen(false);
    if (!n.isRead) readOne.mutate(n.id);
    if (n.linkUrl) navigate(n.linkUrl);
  };

  return (
    <Dropdown show={open} onToggle={setOpen} align="end">
      <Dropdown.Toggle
        as="button"
        className="btn btn-outline-secondary btn-sm position-relative d-inline-flex align-items-center justify-content-center notification-toggle"
        aria-label="Notifications"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notification-menu">
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <strong className="small">Notifications</strong>
          {unread > 0 && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending}
            >
              Mark all read
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="px-3 py-3 text-muted small">No notifications.</div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`notification-item text-start w-100 ${n.isRead ? '' : 'notification-item--unread'}`}
              onClick={() => openItem(n)}
            >
              <div className="d-flex justify-content-between gap-2">
                <span className="fw-medium small">{n.title}</span>
                <span className="text-muted flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                  {relativeTime(n.createdAt)}
                </span>
              </div>
              <div className="text-muted small">{n.message}</div>
            </button>
          ))
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
