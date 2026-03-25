import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminStats, fetchAdminUsers, adminDeleteNote, toggleAdminRole } from '../api'

export default function AdminPage() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('stats')

  useEffect(() => {
    loadStats()
    loadUsers()
  }, [])

  const loadStats = async () => {
    try {
      const data = await fetchAdminStats()
      setStats(data)
    } catch {
      setError('Access denied or failed to load stats')
    }
  }

  const loadUsers = async () => {
    try {
      const data = await fetchAdminUsers()
      setUsers(data)
    } catch { }
  }

  const handleToggleAdmin = async (userId) => {
    try {
      const updated = await toggleAdminRole(userId)
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, isAdmin: updated.isAdmin } : u))
    } catch {
      setError('Failed to update role')
    }
  }

  if (error) return (
    <div style={styles.container}>
      <Link to="/" style={styles.back}>← Back</Link>
      <p style={styles.error}>{error}</p>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/" style={styles.back}>← Back</Link>
        <h2 style={{ margin: 0 }}>Admin Panel</h2>
      </div>

      <div style={styles.tabs}>
        {['stats', 'users'].map(t => (
          <button
            key={t}
            style={{ ...styles.tab, ...(activeTab === t ? styles.activeTab : {}) }}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && stats && (
        <div style={styles.statsGrid}>
          {[
            { label: 'Total Notes', value: stats.totalNotes },
            { label: 'Archived Notes', value: stats.archivedNotes },
            { label: 'Encrypted Notes', value: stats.encryptedNotes },
            { label: 'Notes Without Content', value: stats.notesWithoutContent },
            { label: 'Total Users', value: stats.totalUsers },
            { label: 'Total Shares', value: stats.totalShares }
          ].map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={styles.statValue}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          {users.length === 0 && <p style={styles.empty}>No users yet.</p>}
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Notes</th>
                <th style={styles.th}>Archived</th>
                <th style={styles.th}>Empty Notes</th>
                <th style={styles.th}>Last Seen</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userId} style={styles.tr}>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>{u.noteCount}</td>
                  <td style={styles.td}>{u.archivedCount}</td>
                  <td style={styles.td}>{u.emptyContentCount}</td>
                  <td style={styles.td}>{new Date(u.lastSeenAt).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <span style={u.isAdmin ? styles.adminBadge : styles.userBadge}>
                      {u.isAdmin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.roleBtn} onClick={() => handleToggleAdmin(u.userId)}>
                      {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '1.5rem' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  back: { color: '#4f46e5', textDecoration: 'none', fontSize: '0.9rem' },
  tabs: { display: 'flex', gap: '0.25rem', marginBottom: '1.5rem' },
  tab: { padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' },
  activeTab: { background: '#4f46e5', color: '#fff' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' },
  statCard: { background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' },
  statValue: { fontSize: '2rem', fontWeight: 700, color: '#4f46e5' },
  statLabel: { fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', background: '#f9fafb', fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#374151' },
  adminBadge: { padding: '0.2rem 0.5rem', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '0.75rem' },
  userBadge: { padding: '0.2rem 0.5rem', background: '#f3f4f6', color: '#6b7280', borderRadius: '4px', fontSize: '0.75rem' },
  roleBtn: { padding: '0.3rem 0.6rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  empty: { textAlign: 'center', color: '#9ca3af' },
  error: { color: '#ef4444', textAlign: 'center', marginTop: '2rem' }
}
