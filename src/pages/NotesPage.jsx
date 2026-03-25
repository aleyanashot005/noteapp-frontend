import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import NoteCard from '../components/NoteCard'
import NoteModal from '../components/NoteModal'
import ShareModal from '../components/ShareModal'
import CreateNote from '../components/CreateNote'
import {
  fetchNotes, fetchSharedNotes, searchNotes,
  createNote, updateNote, updateNoteColor, deleteNote, toggleArchive,
  getUnreadCount
} from '../api'
import { useSignalR } from '../hooks/useSignalR'

const PAGE_SIZE = 20

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

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [sharedNotes, setSharedNotes] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [section, setSection] = useState('notes') // 'notes' | 'shared' | 'archive'
  const [view, setView] = useState('grid') // 'grid' | 'list'
  const [search, setSearch] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const [editingNote, setEditingNote] = useState(null)
  const [sharingNote, setSharingNote] = useState(null)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const loaderRef = useRef(null)
  const loadingRef = useRef(false)
  const currentSectionRef = useRef(section)
  const searchTimeout = useRef(null)

  useSignalR(() => setUnreadCount(c => c + 1))

  useEffect(() => {
    currentSectionRef.current = section
    loadingRef.current = false
    setNotes([])
    setPage(1)
    setHasMore(true)
    loadNotes(1, false, section)
    loadUnreadCount()
  }, [section])

  const loadUnreadCount = async () => {
    try { setUnreadCount(await getUnreadCount()) } catch { }
  }

  const loadNotes = async (pageNum, append, forSection) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const sec = forSection ?? currentSectionRef.current
    try {
      if (sec === 'shared') {
        const data = await fetchSharedNotes()
        setSharedNotes(data)
        setHasMore(false)
      } else {
        const includeArchived = sec === 'archive'
        const data = await fetchNotes(pageNum, PAGE_SIZE, includeArchived)
        const items = data.items.filter(n => sec === 'archive' ? n.isArchived : !n.isArchived)
        setNotes(prev => append ? [...prev, ...items] : items)
        setHasMore(pageNum * PAGE_SIZE < data.totalCount)
        setPage(pageNum)
      }
    } catch {
      setError('Failed to load notes')
      setHasMore(false)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || section === 'shared') return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current)
        loadNotes(page + 1, true)
    }, { threshold: 0.1 })
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, page, section])

  const handleSearch = e => {
    const q = e.target.value
    setSearch(q)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      if (!q.trim()) { loadingRef.current = false; loadNotes(1, false); return }
      try {
        const results = await searchNotes(q.trim(), section === 'archive')
        setNotes(results)
        setHasMore(false)
      } catch { setError('Search failed') }
    }, 300)
  }

  const handleCreate = async ({ title, content, color, isEncrypted, encKey }) => {
    if (!title.trim() && !content.trim()) return
    let finalContent = content
    if (isEncrypted && encKey) finalContent = await encryptContent(content, encKey)
    const note = await createNote(title, finalContent, isEncrypted, color)
    if (section === 'notes') setNotes(prev => [note, ...prev])
  }

  const handleSaveEdit = async (id, title, content, color) => {
    const updated = await updateNote(id, title, content, color)
    setNotes(prev => prev.map(n => n.id === id ? updated : n))
    setSharedNotes(prev => prev.map(s => s.note?.id === id ? { ...s, note: updated } : s))
  }

  const handleColorChange = async (id, color) => {
    const updated = await updateNoteColor(id, color)
    setNotes(prev => prev.map(n => n.id === id ? updated : n))
  }

  const handleDelete = async id => {
    await deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const handleArchive = async id => {
    await toggleArchive(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const displayNotes = section === 'shared' ? null : notes
  const isEmpty = section === 'shared' ? sharedNotes.length === 0 : notes.length === 0

  const NAV = [
    { id: 'notes', icon: '💡', label: 'Notes' },
    { id: 'shared', icon: '👥', label: 'Shared with me' },
    { id: 'archive', icon: '📦', label: 'Archive' },
  ]

  return (
    <div style={styles.shell}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.menuBtn} onClick={() => setSidebarExpanded(v => !v)}>☰</button>
          <span style={styles.logo}>NoteApp</span>
        </div>

        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.searchInput}
            placeholder="Search"
            value={search}
            onChange={handleSearch}
          />
          {search && <button style={styles.clearBtn} onClick={() => { setSearch(''); loadingRef.current = false; loadNotes(1, false) }}>✕</button>}
        </div>

        <div style={styles.headerRight}>
          <Link to="/notifications" style={styles.iconBtn} title="Notifications">
            🔔
            {unreadCount > 0 && <span style={styles.notifBadge}>{unreadCount}</span>}
          </Link>
          <button
            style={styles.iconBtn}
            title={view === 'grid' ? 'List view' : 'Grid view'}
            onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
          >
            {view === 'grid' ? '☰' : '⊞'}
          </button>
          <Link to="/admin" style={styles.iconBtn} title="Admin">⚙️</Link>
          <button style={styles.iconBtn} onClick={handleLogout} title="Logout">🚪</button>
        </div>
      </header>

      <div style={styles.body}>
        {/* Sidebar */}
        <nav
          style={{ ...styles.sidebar, width: sidebarExpanded ? '240px' : '72px' }}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          {NAV.map(item => (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                background: section === item.id ? '#feefc3' : 'transparent',
                justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              }}
              onClick={() => setSection(item.id)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {sidebarExpanded && <span style={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main style={styles.main}>
          {error && <p style={styles.error}>{error}</p>}

          {/* Create note — only for notes section */}
          {section === 'notes' && !search && (
            <CreateNote onSave={handleCreate} />
          )}

          {/* Section label */}
          {section !== 'notes' && (
            <p style={styles.sectionLabel}>
              {section === 'shared' ? 'Shared with me' : 'Archive'}
            </p>
          )}

          {/* Notes grid/list */}
          {isEmpty && !loading ? (
            <p style={styles.empty}>
              {section === 'notes' ? 'Notes you add appear here' :
               section === 'shared' ? 'No notes shared with you' :
               'No archived notes'}
            </p>
          ) : (
            <div style={view === 'grid' ? styles.grid : styles.list}>
              {section === 'shared'
                ? sharedNotes.map(item => (
                    <NoteCard
                      key={item.note.id}
                      note={item.note}
                      view={view}
                      isShared
                      sharePermission={item.permission}
                      onEdit={n => setEditingNote({ ...n, readOnly: item.permission === 'View' })}
                      onColorChange={() => {}}
                      onDelete={() => {}}
                      onArchive={() => {}}
                      onShare={() => {}}
                    />
                  ))
                : displayNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      view={view}
                      onEdit={n => setEditingNote(n)}
                      onColorChange={handleColorChange}
                      onDelete={handleDelete}
                      onArchive={handleArchive}
                      onShare={n => setSharingNote(n)}
                    />
                  ))
              }
            </div>
          )}

          <div ref={loaderRef} style={{ height: '1px' }} />
          {loading && <p style={styles.loadingText}>Loading...</p>}
        </main>
      </div>

      {/* Edit modal */}
      {editingNote && (
        <NoteModal
          note={editingNote}
          readOnly={editingNote.readOnly}
          onSave={handleSaveEdit}
          onClose={() => setEditingNote(null)}
        />
      )}

      {/* Share modal */}
      {sharingNote && (
        <ShareModal note={sharingNote} onClose={() => setSharingNote(null)} />
      )}
    </div>
  )
}

const styles = {
  shell: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8f9fa' },

  // Header
  header: { height: '64px', background: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', padding: '0 8px', gap: '8px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '4px', minWidth: '240px' },
  menuBtn: { background: 'none', border: 'none', fontSize: '18px', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: '20px', fontWeight: 400, color: '#5f6368', letterSpacing: '0.5px' },
  searchWrap: { flex: 1, maxWidth: '720px', position: 'relative', display: 'flex', alignItems: 'center', background: '#f1f3f4', borderRadius: '24px', height: '46px', padding: '0 16px' },
  searchIcon: { fontSize: '16px', marginRight: '8px', color: '#5f6368' },
  searchInput: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '16px', color: '#202124' },
  clearBtn: { background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#5f6368' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' },
  iconBtn: { background: 'none', border: 'none', fontSize: '18px', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: 'inherit', textDecoration: 'none' },
  notifBadge: { position: 'absolute', top: '4px', right: '4px', background: '#d93025', color: '#fff', fontSize: '10px', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },

  // Body
  body: { display: 'flex', flex: 1, marginTop: '64px', overflow: 'hidden' },

  // Sidebar
  sidebar: { flexShrink: 0, paddingTop: '8px', transition: 'width 0.2s', overflow: 'hidden', background: '#f8f9fa' },
  navItem: { width: '100%', border: 'none', borderRadius: '0 24px 24px 0', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#202124', transition: 'background 0.15s' },
  navIcon: { fontSize: '18px', flexShrink: 0, width: '24px', textAlign: 'center' },
  navLabel: { whiteSpace: 'nowrap', fontWeight: 500 },

  // Main
  main: { flex: 1, overflowY: 'auto', padding: '24px 16px' },
  sectionLabel: { fontWeight: 500, color: '#80868b', fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '16px', marginLeft: '4px' },

  // Grid / List
  grid: { columns: '4 220px', columnGap: '12px' },
  list: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },

  empty: { color: '#80868b', textAlign: 'center', marginTop: '80px', fontSize: '14px' },
  loadingText: { textAlign: 'center', color: '#9aa0a6', fontSize: '13px' },
  error: { color: '#d93025', textAlign: 'center', fontSize: '13px', marginBottom: '12px' },
}
