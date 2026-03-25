import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import ColorPicker from './ColorPicker'

const URL_REGEX = /(https?:\/\/[^\s]+)/g
const MARKDOWN_PATTERN = /^(#{1,6}\s|[*_]{1,2}|\d+\.\s|-\s|\[.*\]\(.*\)|```)/m

function renderContent(content) {
  if (MARKDOWN_PATTERN.test(content)) {
    return <div className="note-markdown"><ReactMarkdown>{content}</ReactMarkdown></div>
  }
  const parts = content.split(URL_REGEX)
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) =>
        URL_REGEX.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
              style={{ color: '#1a73e8' }} onClick={e => e.stopPropagation()}>{part}</a>
          : part
      )}
    </span>
  )
}

export default function NoteCard({ note, view, onEdit, onDelete, onArchive, onShare, onColorChange, isShared, sharePermission }) {
  const [hovered, setHovered] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const canEdit = !isShared || sharePermission === 'Edit'
  const bg = note.color || '#fff'
  const isList = view === 'list'

  return (
    <div
      style={{ ...styles.card, background: bg, ...(isList ? styles.cardList : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowColorPicker(false) }}
    >
      {/* Title */}
      {note.title && (
        <div style={styles.title} onClick={() => canEdit && onEdit(note)}>
          {note.title}
          {note.isEncrypted && <span style={styles.lock}>🔒</span>}
        </div>
      )}

      {/* Content */}
      <div style={{ ...styles.content, cursor: canEdit ? 'pointer' : 'default' }}
           onClick={() => canEdit && onEdit(note)}>
        {note.isEncrypted
          ? <span style={{ color: '#80868b', fontStyle: 'italic' }}>Encrypted note</span>
          : <div style={isList ? {} : styles.clamp}>
              {renderContent(note.content)}
            </div>
        }
      </div>

      {/* Badges */}
      <div style={styles.badges}>
        {isShared && <span style={styles.badge}>Shared ({sharePermission})</span>}
        {note.isArchived && <span style={styles.badge}>Archived</span>}
      </div>

      {/* Hover actions */}
      {hovered && (
        <div style={styles.actions}>
          <div style={{ position: 'relative' }}>
            <ActionBtn title="Change color" onClick={() => setShowColorPicker(v => !v)}>🎨</ActionBtn>
            {showColorPicker && (
              <ColorPicker
                currentColor={note.color}
                onChange={color => onColorChange(note.id, color)}
                onClose={() => setShowColorPicker(false)}
              />
            )}
          </div>
          {!isShared && <ActionBtn title="Share" onClick={() => onShare(note)}>👤</ActionBtn>}
          {!isShared && (
            <ActionBtn title={note.isArchived ? 'Unarchive' : 'Archive'} onClick={() => onArchive(note.id)}>
              {note.isArchived ? '📤' : '📥'}
            </ActionBtn>
          )}
          {canEdit && <ActionBtn title="Edit" onClick={() => onEdit(note)}>✏️</ActionBtn>}
          {!isShared && <ActionBtn title="Delete" onClick={() => onDelete(note.id)}>🗑️</ActionBtn>}
        </div>
      )}

      {/* Date */}
      <div style={{ ...styles.date, opacity: hovered ? 0 : 1 }}>
        {new Date(note.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}

function ActionBtn({ title, onClick, children }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick() }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(0,0,0,0.08)' : 'transparent',
        border: 'none',
        borderRadius: '50%',
        width: '28px',
        height: '28px',
        fontSize: '14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

const styles = {
  card: {
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    padding: '12px',
    cursor: 'default',
    position: 'relative',
    breakInside: 'avoid',
    marginBottom: '12px',
    transition: 'box-shadow 0.15s',
    ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
  },
  cardList: {
    maxWidth: '600px',
    width: '100%',
  },
  title: {
    fontWeight: 500,
    fontSize: '14px',
    marginBottom: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  lock: { fontSize: '12px' },
  content: {
    fontSize: '13px',
    color: '#3c4043',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
  clamp: {
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 10,
    WebkitBoxOrient: 'vertical',
  },
  badges: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' },
  badge: { fontSize: '11px', padding: '2px 6px', background: 'rgba(0,0,0,0.08)', borderRadius: '10px', color: '#5f6368' },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    marginTop: '8px',
    paddingTop: '4px',
  },
  date: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    fontSize: '11px',
    color: '#9aa0a6',
    transition: 'opacity 0.15s',
  }
}
