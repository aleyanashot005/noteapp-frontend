import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [editingNote, setEditingNote] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session.access_token}` }
  }

  const fetchNotes = async () => {
    try {
      const headers = await getHeaders()
      const res = await axios.get(`${API_URL}/api/notes`, { headers })
      setNotes(res.data)
    } catch {
      setError('Failed to load notes')
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  const handleSearch = async (e) => {
    const q = e.target.value
    setSearch(q)
    const headers = await getHeaders()
    if (q.trim() === '') {
      fetchNotes()
    } else {
      const res = await axios.get(`${API_URL}/api/notes/search?q=${q}`, { headers })
      setNotes(res.data)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const headers = await getHeaders()
    try {
      if (editingNote) {
        await axios.put(`${API_URL}/api/notes/${editingNote.id}`, { title, content }, { headers })
        setEditingNote(null)
      } else {
        await axios.post(`${API_URL}/api/notes`, { title, content }, { headers })
      }
      setTitle('')
      setContent('')
      fetchNotes()
    } catch {
      setError('Failed to save note')
    }
  }

  const handleEdit = (note) => {
    setEditingNote(note)
    setTitle(note.title)
    setContent(note.content)
  }

  const handleDelete = async (id) => {
    const headers = await getHeaders()
    await axios.delete(`${API_URL}/api/notes/${id}`, { headers })
    fetchNotes()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleCancel = () => {
    setEditingNote(null)
    setTitle('')
    setContent('')
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>My Notes</h1>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      <input
        style={styles.search}
        type="text"
        placeholder="Search notes..."
        value={search}
        onChange={handleSearch}
      />

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
          placeholder="Content"
          value={content}
          onChange={e => setContent(e.target.value)}
          required
        />
        {error && <p style={styles.error}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={styles.button} type="submit">
            {editingNote ? 'Update Note' : 'Add Note'}
          </button>
          {editingNote && (
            <button style={styles.cancelBtn} type="button" onClick={handleCancel}>Cancel</button>
          )}
        </div>
      </form>

      <div style={styles.notesList}>
        {notes.length === 0 && <p>No notes yet. Create your first one!</p>}
        {notes.map(note => (
          <div key={note.id} style={styles.noteCard}>
            <h3>{note.title}</h3>
            <p>{note.content}</p>
            <div style={styles.noteActions}>
              <button style={styles.editBtn} onClick={() => handleEdit(note)}>Edit</button>
              <button style={styles.deleteBtn} onClick={() => handleDelete(note.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  search: { width: '100%', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' },
  input: { padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  textarea: { padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', minHeight: '100px', resize: 'vertical' },
  button: { padding: '0.75rem 1.5rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' },
  cancelBtn: { padding: '0.75rem 1.5rem', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' },
  logoutBtn: { padding: '0.5rem 1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  notesList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  noteCard: { background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  noteActions: { display: 'flex', gap: '0.5rem', marginTop: '0.75rem' },
  editBtn: { padding: '0.4rem 1rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { padding: '0.4rem 1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  error: { color: 'red', margin: 0 }
}
