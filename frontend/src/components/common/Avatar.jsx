export default function Avatar({ name = '', size = 36, src = null }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    '#0078d4','#10b981','#f59e0b','#ef4444',
    '#8b5cf6','#ec4899','#06b6d4','#84cc16'
  ];

  const colorIndex = name.charCodeAt(0) % colors.length;
  const bg = colors[colorIndex] || '#0078d4';

  if (src) {
    return (
      <img src={src} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: bg, color: '#fff',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: '600',
      flexShrink: 0, userSelect: 'none'
    }}>
      {initials}
    </div>
  );
}