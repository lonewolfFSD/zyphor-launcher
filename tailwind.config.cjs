/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
      },
      
      colors: {
        void: '#000000',          // pure OLED black
        panel: '#0a0a0a',         // almost black glass
        'panel-2': '#111111',
        edge: 'rgba(255,255,255,0.08)',
        'edge-soft': 'rgba(255,255,255,0.04)',
        steel: '#5b7c99',
        'steel-dim': '#324451',
        bulb: '#e3a857',
        'bulb-dim': '#6b5227',
        bone: '#e9e6df',
        ash: '#8b8d92',
        rust: '#8a3a30',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        wider2: '0.18em',
        wider3: '0.28em',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)',
        'glow-bulb': '0 0 40px rgba(227,168,87,0.25)',
      },
      backdropBlur: {
        glass: '20px',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        rise: 'rise 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fadeIn 0.4s ease both',
        'scale-in': 'scaleIn 0.45s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};