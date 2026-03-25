import { useState, useEffect, useRef } from 'react'
import ColorPicker from './ColorPicker'

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

export default function NoteModal({ note, onSave, onClose, readOnly }) {
  const [title, setTitle] = useState(note.title || '')
  const [content, setContent] = useState('')
  const [color, setColor] = useState(note.color || null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [encKey, setEncKey] = useState('')
  const [decryptError, setDecryptError] = useState('')
  const [decrypted, setDecrypted] = useState(!note.isEncrypted)
  const ref = useRef(null)

  useEffect(() => {
    if (!note.isEncrypted) setContent(note.content || '')
  }, [note])

  const handleDecrypt = async () => {
    try {
      const plain = await decryptContent(note.content, encKey)
      setContent(plain)
      setDecrypted(true)
      setDecryptError('')
    } catch {
      setDecryptError('Wrong key')
    }
  }

  const handleSave = async () => {
    let finalContent = content
    if (note.isEncrypted && encKey && decrypted) {
      finalContent = await encryptContent(content, encKey)
    }
    onSave(note.id, title, finalContent, color)
    onClose()
  }

  const bg = color || '#fff'

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && !readOnly && handleSave()}>
      <div ref={ref} style={{ ...styles.modal, background: bg }}>
        {/* Title */}
        <input
          style={styles.titleInput}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          readOnly={readOnly}
        />

        {/* Content */}
        {!decrypted ? (
          <div style={styles.decryptArea}>
            <p style={{ color: '#5f6368', fontSize: '13px', marginBottom: '8px' }}>
              🔒 This note is encrypted. Enter the key to edit it.
            </p>
            <input
              type="password"
              style={styles.keyInput}
              placeholder="Encryption key"
              value={encKey}
              onChange={e => setEncKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDecrypt()}
              autoFocus
            />
            {decryptError && <p style={{ color: '#d93025', fontSize: '12px', marginTop: '4px' }}>{decryptError}</p>}
            <button style={styles.decryptBtn} onClick={handleDecrypt}>Decrypt</button>
          </div>
        ) : (
          <textarea
            style={styles.contentInput}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Take a note..."
            readOnly={readOnly}
          />
        )}

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            {!readOnly && (
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
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={styles.cancelBtn} onClick={onClose}>
              {readOnly ? 'Close' : 'Discard'}
            </button>
            {!readOnly && (
              <button style={styles.saveBtn} onClick={handleSave}>Save</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ title, onClick, children }) {
  return (
    <button title={title} onClick={onClick}
      style={{ background: 'transparent', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer' }}>
      {children}
    </button>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { width: '560px', maxWidth: '95vw', maxHeight: '85vh', borderRadius: '8px', padding: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  titleInput: { width: '100%', border: 'none', outline: 'none', fontSize: '16px', fontWeight: 500, background: 'transparent', marginBottom: '10px', padding: 0, fontFamily: 'inherit' },
  contentInput: { width: '100%', flex: 1, border: 'none', outline: 'none', fontSize: '14px', background: 'transparent', resize: 'none', padding: 0, lineHeight: '1.6', fontFamily: 'inherit', minHeight: '200px' },
  decryptArea: { padding: '12px 0' },
  keyInput: { width: '100%', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' },
  decryptBtn: { marginTop: '8px', padding: '6px 16px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.08)' },
  toolbarLeft: { display: 'flex', gap: '4px' },
  cancelBtn: { padding: '6px 16px', background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: '#5f6368', fontWeight: 500 },
  saveBtn: { padding: '6px 16px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 },
}
