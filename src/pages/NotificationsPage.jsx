import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchNotifications, markAsRead, markAllAsRead } from '../api'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const data = await fetchNotifications()
      setNotifications(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (id) => {
    await markAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const handleMarkAll = async () => {
    await markAllAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/" style={styles.back}>← Back</Link>
        <h2 style={{ margin: 0 }}>Notifications</h2>
        {notifications.some(n => !n.isRead) && (
          <button style={styles.markAllBtn} onClick={handleMarkAll}>Mark all as read</button>
        )}
      </div>

      {loading && <p style={styles.empty}>Loading...</p>}

      {!loading && notifications.length === 0 && (
        <p style={styles.empty}>No notifications yet.</p>
      )}

      {notifications.map(n => (
        <div key={n.id} style={{ ...styles.item, ...(n.isRead ? {} : styles.unread) }}>
          <div style={styles.itemContent}>
            <p style={styles.message}>{n.message}</p>
            <span style={styles.time}>{new Date(n.createdAt).toLocaleString()}</span>
          </div>
          {!n.isRead && (
            <button style={styles.readBtn} onClick={() => handleMarkRead(n.id)}>Mark read</button>
          )}
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: { maxWidth: '700px', margin: '0 auto', padding: '1.5rem' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  back: { color: '#4f46e5', textDecoration: 'none', fontSize: '0.9rem' },
  markAllBtn: { marginLeft: 'auto', padding: '0.4rem 0.8rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  item: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '8px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '0.5rem' },
  unread: { borderLeft: '3px solid #4f46e5', background: '#f5f3ff' },
  itemContent: { flex: 1 },
  message: { margin: '0 0 0.25rem', fontSize: '0.95rem', color: '#111827' },
  time: { fontSize: '0.75rem', color: '#9ca3af' },
  readBtn: { padding: '0.3rem 0.6rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: '#374151', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: '3rem' }
}
