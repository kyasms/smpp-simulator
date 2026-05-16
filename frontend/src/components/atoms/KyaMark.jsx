export default function KyaMark({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="10.25" stroke={color} strokeWidth="1.2" />
      <path d="M7.5 5.5 V16.5 M7.5 11 L14.5 5.5 M7.5 11 L14.5 16.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
