const COLORS = [
  { name: 'Default', value: null },
  { name: 'Coral', value: '#f28b82' },
  { name: 'Peach', value: '#fbbc04' },
  { name: 'Sand', value: '#fff475' },
  { name: 'Sage', value: '#ccff90' },
  { name: 'Fog', value: '#a7ffeb' },
  { name: 'Storm', value: '#cbf0f8' },
  { name: 'Denim', value: '#aecbfa' },
  { name: 'Lilac', value: '#d7aefb' },
  { name: 'Blush', value: '#fdcfe8' },
  { name: 'Chalk', value: '#e6c9a8' },
  { name: 'Graphite', value: '#e8eaed' },
]

export { COLORS }

export default function ColorPicker({ currentColor, onChange, onClose }) {
  return (
    <div style={styles.container} onMouseLeave={onClose}>
      <div style={styles.grid}>
        {COLORS.map(c => (
          <button
            key={c.name}
            title={c.name}
            onClick={() => { onChange(c.value); onClose() }}
            style={{
              ...styles.swatch,
              background: c.value ?? '#fff',
              border: (currentColor === c.value) ? '2px solid #202124' : '2px solid transparent',
              outline: c.value === null ? '1px solid #e0e0e0' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    position: 'absolute',
    bottom: '40px',
    left: '0',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    padding: '8px',
    zIndex: 100,
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    width: '152px',
  },
  swatch: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
  }
}
