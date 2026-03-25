import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import NoteCard from '../components/NoteCard'
import ShareModal from '../components/ShareModal'
import {
  fetchNotes, fetchSharedNotes, searchNotes,
  createNote, updateNote, deleteNote, toggleArchive,
  getUnreadCount
} from '../api'
import { useSignalR } from '../hooks/useSignalR'

const PAGE_SIZE = 20

// Client-side encryption using Web Crypto API (AES-GCM)
async function encryptContent(plaintext, key) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(key.padEnd(32, '0').slice(0, 32)), 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyMaterial, enc.encode(plaintext))
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.byteLength)
  return btoa(String.fromCharCode(...combined))
}

async function decryptContent(ciphertext, key) {
  const enc = new TextEncoder()
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(key.padEnd(32, '0').slice(0, 32)), 'AES-GCM', false, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, data)
  return new TextDecoder().decode(decrypted)
}

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [sharedNotes, setSharedNotes] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('mine') // 'mine' | 'shared' | 'archived'
  const [search, setSearch] = useState('')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [encKey, setEncKey] = useState('')
  const [editingNote, setEditingNote] = useState(null)
  const [error, setError] = useState('')

  const [sharingNote, setSharingNote] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Decrypt modal
  const [decryptNote, setDecryptNote] = useState(null)
  const [decryptKey, setDecryptKey] = useState('')
  const [decryptError, setDecryptError] = useState('')

  const navigate = useNavigate()
  const loaderRef = useRef(null)
  const searchTimeout = useRef(null)

  const { } = useSignalR((notification) => {
    setUnreadCount(c => c + 1)
  })

  useEffect(() => {
    loadUnreadCount()
    loadNotes(1, false)
  }, [tab])

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch { }
  }

  const loadNotes = async (pageNum, append) => {
    if (loading) return
    setLoading(true)
    try {
      if (tab === 'shared') {
        const data = await fetchSharedNotes()
        setSharedNotes(data)
        setHasMore(false)
      } else {
        const includeArchived = tab === 'archived'
        const data = await fetchNotes(pageNum, PAGE_SIZE, includeArchived)
        const items = data.items.filter(n => tab === 'archived' ? n.isArchived : !n.isArchived)
        if (append) {
          setNotes(prev => [...prev, ...items])
        } else {
          setNotes(items)
        }
        setHasMore(pageNum * PAGE_SIZE < data.totalCount)
        setPage(pageNum)
      }
    } catch {
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current || tab === 'shared') return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading)
          loadNotes(page + 1, true)
      },
      { threshold: 0.1 }
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, page, tab])

  const handleSearch = (e) => {
    const q = e.target.value
    setSearch(q)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      if (!q.trim()) {
        loadNotes(1, false)
        return
      }
      try {
        const results = await searchNotes(q.trim(), tab === 'archived')
        setNotes(results)
        setHasMore(false)
      } catch {
        setError('Search failed')
      }
    }, 300)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      let finalContent = content
      let encrypted = isEncrypted

      if (isEncrypted && encKey) {
        finalContent = await encryptContent(content, encKey)
      }

      if (editingNote) {
        await updateNote(editingNote.id, title, finalContent)
        setEditingNote(null)
      } else {
        await createNote(title, finalContent, encrypted)
      }

      setTitle('')
      setContent('')
      setEncKey('')
      setIsEncrypted(false)
      loadNotes(1, false)
    } catch {
      setError('Failed to save note')
    }
  }

  const handleEdit = async (note) => {
    if (note.isEncrypted) {
      setDecryptNote(note)
      setDecryptKey('')
      setDecryptError('')
      return
    }
    setEditingNote(note)
    setTitle(note.title)
    setContent(note.content)
    setIsEncrypted(note.isEncrypted)
  }

  const handleDecryptAndEdit = async () => {
    try {
      const plain = await decryptContent(decryptNote.content, decryptKey)
      setEditingNote(decryptNote)
      setTitle(decryptNote.title)
      setContent(plain)
      setIsEncrypted(true)
      setEncKey(decryptKey)
      setDecryptNote(null)
    } catch {
      setDecryptError('Wrong key or corrupted content')
    }
  }

  const handleDelete = async (id) => {
    await deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const handleArchive = async (id) => {
    const updated = await toggleArchive(id)
    setNotes(prev => prev.filter(n => n.id !== id))
    // If we're in 'mine' tab, the archived note disappears; in 'archived' tab the unarchived note disappears
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const displayedNotes = tab === 'shared' ? null : notes

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.logo}>NoteApp</h1>
        <div style={styles.headerActions}>
          <Link to="/notifications" style={styles.notifBtn}>
            🔔 {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
          </Link>
          <Link to="/admin" style={styles.adminLink}>Admin</Link>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['mine', 'shared', 'archived'].map(t => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === t ? styles.activeTab : {}) }}
            onClick={() => { setTab(t); setSearch(''); setNotes([]); setPage(1); setHasMore(true) }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        style={styles.search}
        type="text"
        placeholder="Search notes..."
        value={search}
        onChange={handleSearch}
      />

      {/* Create / Edit Form */}
      {tab !== 'shared' && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <textarea
            style={styles.textarea}
            placeholder="Content (supports Markdown)"
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />
          <div style={styles.encryptRow}>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={e => setIsEncrypted(e.target.checked)}
              />
              {' '}Encrypt this note
            </label>
            {isEncrypted && (
              <input
                style={{ ...styles.input, flex: 1 }}
                type="password"
                placeholder="Encryption key (keep it safe — never stored)"
                value={encKey}
                onChange={e => setEncKey(e.target.value)}
                required={isEncrypted}
              />
            )}
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={styles.button} type="submit">
              {editingNote ? 'Update Note' : 'Add Note'}
            </button>
            {editingNote && (
              <button style={styles.cancelBtn} type="button" onClick={() => {
                setEditingNote(null); setTitle(''); setContent(''); setIsEncrypted(false); setEncKey('')
              }}>Cancel</button>
            )}
          </div>
        </form>
      )}

      {/* Notes List */}
      <div>
        {tab === 'shared' ? (
          sharedNotes.length === 0
            ? <p style={styles.empty}>No notes shared with you yet.</p>
            : sharedNotes.map(item => (
              <NoteCard
                key={item.note.id}
                note={item.note}
                isShared
                sharePermission={item.permission}
                onEdit={handleEdit}
                onDelete={() => {}}
                onArchive={() => {}}
                onShare={() => {}}
              />
            ))
        ) : (
          displayedNotes.length === 0 && !loading
            ? <p style={styles.empty}>No notes here. {tab === 'mine' ? 'Create your first one!' : ''}</p>
            : displayedNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onShare={n => setSharingNote(n)}
              />
            ))
        )}

        {/* Infinite scroll trigger */}
        {tab !== 'shared' && <div ref={loaderRef} style={{ height: '1px' }} />}
        {loading && <p style={styles.loadingMore}>Loading...</p>}
      </div>

      {/* Share Modal */}
      {sharingNote && (
        <ShareModal note={sharingNote} onClose={() => setSharingNote(null)} />
      )}

      {/* Decrypt Modal */}
      {decryptNote && (
        <div style={styles.overlay}>
          <div style={styles.decryptModal}>
            <h3>Enter encryption key</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Enter the key you used when creating this note.</p>
            <input
              style={styles.input}
              type="password"
              placeholder="Encryption key"
              value={decryptKey}
              onChange={e => setDecryptKey(e.target.value)}
              autoFocus
            />
            {decryptError && <p style={styles.error}>{decryptError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button style={styles.button} onClick={handleDecryptAndEdit}>Decrypt & Edit</button>
              <button style={styles.cancelBtn} onClick={() => setDecryptNote(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  logo: { margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#4f46e5' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  notifBtn: { position: 'relative', textDecoration: 'none', fontSize: '1.1rem' },
  badge: { position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', borderRadius: '9999px', padding: '0.1rem 0.35rem', fontWeight: 700 },
  adminLink: { color: '#4f46e5', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 },
  logoutBtn: { padding: '0.4rem 0.9rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  tabs: { display: 'flex', gap: '0.25rem', marginBottom: '1rem' },
  tab: { padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' },
  activeTab: { background: '#4f46e5', color: '#fff' },
  search: { width: '100%', padding: '0.65rem 0.75rem', marginBottom: '1.25rem', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.95rem', boxSizing: 'border-box' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem', background: '#f9fafb', padding: '1rem', borderRadius: '8px' },
  input: { padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.95rem' },
  textarea: { padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.95rem', minHeight: '100px', resize: 'vertical' },
  encryptRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', color: '#374151', whiteSpace: 'nowrap' },
  button: { padding: '0.65rem 1.25rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.95rem', cursor: 'pointer' },
  cancelBtn: { padding: '0.65rem 1.25rem', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.95rem', cursor: 'pointer' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: '2rem' },
  loadingMore: { textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' },
  error: { color: '#ef4444', margin: 0, fontSize: '0.85rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  decryptModal: { background: '#fff', padding: '1.5rem', borderRadius: '8px', width: '380px', maxWidth: '90vw' }
}
