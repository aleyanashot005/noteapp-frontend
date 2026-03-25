import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

// Regex to detect URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g

function renderContent(content) {
  // Check if content looks like markdown (has headers, bold, lists, etc.)
  const markdownPattern = /^(#{1,6}\s|[*_]{1,2}|\d+\.\s|-\s|\[.*\]\(.*\)|```)/m
  if (markdownPattern.test(content)) {
    return <ReactMarkdown>{content}</ReactMarkdown>
  }

  // Otherwise render with clickable URLs
  const parts = content.split(URL_REGEX)
  return (
    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
      {parts.map((part, i) =>
        URL_REGEX.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>{part}</a>
          : part
      )}
    </p>
  )
}

export default function NoteCard({ note, onEdit, onDelete, onArchive, onShare, isShared, sharePermission }) {
  const [showContent, setShowContent] = useState(false)
  const canEdit = !isShared || sharePermission === 'Edit'

  return (
    <div style={{
      ...styles.card,
      borderLeft: note.isArchived ? '4px solid #9ca3af' : note.isEncrypted ? '4px solid #f59e0b' : '4px solid #4f46e5'
    }}>
      <div style={styles.cardHeader} onClick={() => setShowContent(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <h3 style={styles.title}>{note.title}</h3>
          {note.isEncrypted && <span style={styles.encBadge}>🔒 Encrypted</span>}
          {note.isArchived && <span style={styles.archBadge}>Archived</span>}
          {isShared && <span style={styles.sharedBadge}>Shared ({sharePermission})</span>}
        </div>
        <span style={styles.chevron}>{showContent ? '▲' : '▼'}</span>
      </div>

      {showContent && (
        <div style={styles.content}>
          {note.isEncrypted
            ? <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>🔒 This note is encrypted. Edit to decrypt.</p>
            : renderContent(note.content)
          }
        </div>
      )}

      <div style={styles.footer}>
        <span style={styles.date}>{new Date(note.updatedAt).toLocaleDateString()}</span>
        <div style={styles.actions}>
          {canEdit && <button style={styles.editBtn} onClick={() => onEdit(note)}>Edit</button>}
          {!isShared && <button style={styles.shareBtn} onClick={() => onShare(note)}>Share</button>}
          {!isShared && <button style={styles.archiveBtn} onClick={() => onArchive(note.id)}>{note.isArchived ? 'Unarchive' : 'Archive'}</button>}
          {!isShared && <button style={styles.deleteBtn} onClick={() => onDelete(note.id)}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

const styles = {
  card: { background: '#fff', padding: '1rem 1.25rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '0.75rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  title: { margin: 0, fontSize: '1rem', fontWeight: 600 },
  chevron: { color: '#9ca3af', fontSize: '0.75rem' },
  content: { marginTop: '0.75rem', color: '#374151', fontSize: '0.95rem', lineHeight: 1.6, borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' },
  date: { fontSize: '0.75rem', color: '#9ca3af' },
  actions: { display: 'flex', gap: '0.4rem' },
  editBtn: { padding: '0.3rem 0.7rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  shareBtn: { padding: '0.3rem 0.7rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  archiveBtn: { padding: '0.3rem 0.7rem', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  deleteBtn: { padding: '0.3rem 0.7rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  encBadge: { fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: '#fef3c7', color: '#92400e', borderRadius: '4px' },
  archBadge: { fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: '#f3f4f6', color: '#6b7280', borderRadius: '4px' },
  sharedBadge: { fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: '#ede9fe', color: '#5b21b6', borderRadius: '4px' }
}
