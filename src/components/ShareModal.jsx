import { useState, useEffect } from 'react'
import { getShares, shareNote, revokeShare } from '../api'

export default function ShareModal({ note, onClose }) {
  const [shares, setShares] = useState([])
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('View')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadShares()
  }, [])

  const loadShares = async () => {
    try {
      const data = await getShares(note.id)
      setShares(data)
    } catch {
      setError('Failed to load shares')
    }
  }

  const handleShare = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await shareNote(note.id, email, permission)
      setEmail('')
      await loadShares()
    } catch (err) {
      const detail = err?.response?.status
        ? `${err.response.status} – ${JSON.stringify(err.response.data)}`
        : err?.message
      setError(`Failed to share: ${detail}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (shareId) => {
    try {
      await revokeShare(note.id, shareId)
      await loadShares()
    } catch {
      setError('Failed to revoke share')
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>Share "{note.title}"</h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleShare} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <select
            style={styles.select}
            value={permission}
            onChange={e => setPermission(e.target.value)}
          >
            <option value="View">Can view</option>
            <option value="Edit">Can edit</option>
          </select>
          <button style={styles.shareBtn} type="submit" disabled={loading}>
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        {shares.length > 0 && (
          <div style={styles.shareList}>
            <p style={styles.sharedLabel}>Shared with:</p>
            {shares.map(s => (
              <div key={s.id} style={styles.shareItem}>
                <span>{s.sharedWithEmail}</span>
                <span style={styles.badge}>{s.permission}</span>
                <button style={styles.revokeBtn} onClick={() => handleRevoke(s.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '8px', padding: '1.5rem', width: '420px', maxWidth: '90vw' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' },
  form: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  input: { flex: 1, padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem', minWidth: '150px' },
  select: { padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' },
  shareBtn: { padding: '0.6rem 1rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  shareList: { borderTop: '1px solid #e5e7eb', paddingTop: '1rem' },
  sharedLabel: { margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#6b7280' },
  shareItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
  badge: { fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#e0e7ff', color: '#4f46e5', borderRadius: '4px' },
  revokeBtn: { marginLeft: 'auto', padding: '0.3rem 0.6rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  error: { color: 'red', margin: '0.5rem 0', fontSize: '0.9rem' }
}
