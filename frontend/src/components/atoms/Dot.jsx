export default function Dot({ tone = 'accent', t, size = 6, pulse = false }) {
  const color =
    tone === 'accent' ? t.accent :
    tone === 'success' ? t.success :
    tone === 'danger' ? t.danger :
    tone === 'warn' ? t.warn :
    t.muted;
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      color: color,
      animation: pulse ? 'kya-pulse 1.6s ease-out infinite' : 'none',
    }} />
  );
}
