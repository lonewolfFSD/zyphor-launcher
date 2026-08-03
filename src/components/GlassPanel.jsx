export default function GlassPanel({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-edge bg-panel/60 shadow-glass backdrop-blur-glass ${className}`}
    >
      {children}
    </div>
  );
}
