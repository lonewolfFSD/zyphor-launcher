export default function Logo({ size = 'large' }) {
  const sizes = {
    large: 'text-7xl md:text-8xl',
    small: 'text-2xl',
  };

  return (
    <div className="select-none text-center">
      <h1
        className={`font-display font-normal tracking-wider2 text-bone ${sizes[size]}`}
        style={{ textShadow: '0 0 60px rgba(227,168,87,0.25), 0 2px 24px rgba(0,0,0,0.6)' }}
      >
        STAY
      </h1>
      {size === 'large' && (
        <p className="mt-2 font-mono text-xs uppercase tracking-wider3 text-ash/80">
          Chapter One &mdash; The Jar Theory
        </p>
      )}
    </div>
  );
}
