/* ----------------------------------------------------------------------- */
/*  Constants                                                               */
/* ----------------------------------------------------------------------- */

const AVATAR_COLORS = [
  '#0078d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const MAX_INITIAL_CHARS = 2;
const FALLBACK_COLOR = '#0078d4';

/* ----------------------------------------------------------------------- */
/*  Helpers                                                                 */
/* ----------------------------------------------------------------------- */

function getInitials(name = '') {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, MAX_INITIAL_CHARS);
}

function getAvatarColor(name = '') {
  const colorIndex = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex] || FALLBACK_COLOR;
}

/* ----------------------------------------------------------------------- */
/*  Subcomponents                                                           */
/* ----------------------------------------------------------------------- */

function AvatarImage({ src, name, size }) {
  return (
    <img
      src={src}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
    />
  );
}

function AvatarInitials({ name, size }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: getAvatarColor(name),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: '600',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {getInitials(name)}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/*  Main component                                                          */
/* ----------------------------------------------------------------------- */

export default function Avatar({ name = '', size = 36, src = null }) {
  if (src) {
    return <AvatarImage src={src} name={name} size={size} />;
  }

  return <AvatarInitials name={name} size={size} />;
}
