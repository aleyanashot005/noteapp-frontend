import { useState, useRef, useEffect } from 'react'
import ColorPicker from './ColorPicker'

export default function CreateNote({ onSave }) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [color, setColor] = useState(null)
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [encKey, setEncKey] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!expanded) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        save()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [expanded, title, content, color, isEncrypted, encKey])

  const save = () => {
    if (title.trim() || content.trim()) {
      onSave({ title, content, color, isEncrypted, encKey })
    }
    setExpanded(false)
    setTitle('')
    setContent('')
    setColor(null)
    setIsEncrypted(false)
    setEncKey('')
    setShowColorPicker(false)
  }

  const bg = color || '#fff'

  if (!expanded) {
    return (
      <div style={styles.collapsed} onClick={() => setExpanded(true)}>
        <span style={styles.placeholder}>Take a note...</span>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ ...styles.expanded, background: bg }}>
      <input
        style={styles.titleInput}
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        style={styles.contentInput}
        placeholder="Take a note..."
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
      />
      {isEncrypted && (
        <input
          style={styles.keyInput}
          type="password"
          placeholder="Encryption key (keep it safe — never stored)"
          value={encKey}
          onChange={e => setEncKey(e.target.value)}
        />
      )}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <div style={{ position: 'relative' }}>
            <ToolBtn title="Change color" onClick={() => setShowColorPicker(v => !v)}>🎨</ToolBtn>
            {showColorPicker && (
              <ColorPicker
                currentColor={color}
                onChange={c => setColor(c)}
                onClose={() => setShowColorPicker(false)}
              />
            )}
          </div>
          <ToolBtn
            title={isEncrypted ? 'Remove encryption' : 'Encrypt note'}
            onClick={() => setIsEncrypted(v => !v)}
            active={isEncrypted}
          >🔒</ToolBtn>
        </div>
        <button style={styles.closeBtn} onClick={save}>Close</button>
      </div>
    </div>
  )
}

function ToolBtn({ title, onClick, children, active }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: active ? 'rgba(0,0,0,0.12)' : hover ? 'rgba(0,0,0,0.06)' : 'transparent',
        border: 'none',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        fontSize: '16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

const styles = {
  collapsed: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '14px 16px',
    cursor: 'text',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    maxWidth: '600px',
    margin: '0 auto 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholder: { color: '#80868b', fontSize: '14px' },
  expanded: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '12px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    maxWidth: '600px',
    margin: '0 auto 24px',
  },
  titleInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontWeight: 500,
    background: 'transparent',
    marginBottom: '8px',
    padding: 0,
  },
  contentInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    background: 'transparent',
    resize: 'none',
    padding: 0,
    lineHeight: '1.5',
  },
  keyInput: {
    width: '100%',
    border: 'none',
    borderTop: '1px solid rgba(0,0,0,0.1)',
    outline: 'none',
    fontSize: '12px',
    background: 'transparent',
    padding: '8px 0 0',
    marginTop: '8px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  toolbarLeft: { display: 'flex', gap: '4px', alignItems: 'center' },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '13px',
    fontWeight: 500,
    color: '#5f6368',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '4px',
  }
}
