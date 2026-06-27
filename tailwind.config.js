/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page:        '#070b12',
        panel:       '#0e1420',
        card:        '#151c2b',
        'card-hover':'#1b2334',
        edge:        '#232c3e',
        ink:         '#e7ecf5',
        muted:       '#8a94a8',
        good:        '#34d399',
        bad:         '#f87171',
        warn:        '#fbbf24',
        // Glass surface semantic tokens
        'glass-base':  'rgba(21, 28, 43, 0.55)',
        'glass-panel': 'rgba(14, 20, 32, 0.75)',
        'glass-edge':  'rgba(255, 255, 255, 0.06)',
        'glass-top':   'rgba(255, 255, 255, 0.10)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        DEFAULT: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      backgroundImage: {
        'glass-edge-gradient':
          'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 50%, transparent 100%)',
      },
      boxShadow: {
        glass:    'inset 0 1px 0 rgba(255,255,255,0.10), inset 1px 0 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.45)',
        'glass-active': 'inset 0 1px 0 rgba(255,255,255,0.16), inset 1px 0 0 rgba(255,255,255,0.10), 0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px var(--accent)',
        glow:     '0 0 24px var(--accent-glow, rgba(99,102,241,0.4))',
        'glow-sm':'0 0 12px var(--accent-glow, rgba(99,102,241,0.3))',
        panel:    '0 -2px 40px rgba(0,0,0,0.6)',
        card:     '0 2px 12px -4px rgba(0,0,0,0.6)',
        cinematic:'0 24px 80px rgba(0,0,0,0.85)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      transitionTimingFunction: {
        spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        250: '250ms',
        350: '350ms',
        400: '400ms',
        600: '600ms',
        800: '800ms',
        1200: '1200ms',
      },
      keyframes: {
        // Character entry from left (ally): warm deceleration + micro-bounce
        'char-enter-left': {
          '0%':   { transform: 'translateX(-120px)', opacity: '0' },
          '70%':  { transform: 'translateX(6px)',    opacity: '1' },
          '85%':  { transform: 'translateX(-3px)',   opacity: '1' },
          '100%': { transform: 'translateX(0)',      opacity: '1' },
        },
        // Character entry from right (rival): sharp, authoritative
        'char-enter-right': {
          '0%':   { transform: 'translateX(120px) scale(1.04)', opacity: '0' },
          '60%':  { transform: 'translateX(-4px) scale(1.01)',  opacity: '1' },
          '100%': { transform: 'translateX(0) scale(1)',        opacity: '1' },
        },
        // Character exit left
        'char-exit-left': {
          '0%':   { transform: 'translateX(0)',    opacity: '1' },
          '100%': { transform: 'translateX(-120px)', opacity: '0' },
        },
        // Character exit right
        'char-exit-right': {
          '0%':   { transform: 'translateX(0)',     opacity: '1' },
          '100%': { transform: 'translateX(120px)', opacity: '0' },
        },
        // Breathing idle — very subtle chest rise
        'char-breathe': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%':      { transform: 'translateY(-2px) scale(1.003)' },
        },
        // Emote pop: scale in + hold + fade out
        'emote-pop': {
          '0%':   { transform: 'scale(0) translateY(0)',   opacity: '0' },
          '25%':  { transform: 'scale(1.2) translateY(-4px)', opacity: '1' },
          '60%':  { transform: 'scale(1) translateY(-8px)', opacity: '1' },
          '100%': { transform: 'scale(0.8) translateY(-14px)', opacity: '0' },
        },
        // Dialogue box fade-in (slightly after portrait settles)
        'dialogue-reveal': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Text cursor blink
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        // Cinematic iris-in (circle expanding from center)
        'iris-in': {
          '0%':   { clipPath: 'circle(0% at 50% 50%)' },
          '100%': { clipPath: 'circle(80% at 50% 50%)' },
        },
        // Cinematic iris-out
        'iris-out': {
          '0%':   { clipPath: 'circle(80% at 50% 50%)' },
          '100%': { clipPath: 'circle(0% at 50% 50%)' },
        },
        // Horizontal wipe reveal (left to right)
        'wipe-reveal': {
          '0%':   { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0% 0 0)' },
        },
        // Camera slow push-in (scale from 1 → 1.04)
        'cam-push': {
          '0%':   { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.04)' },
        },
        // Camera slow pull-back (scale from 1 → 0.96)
        'cam-pull': {
          '0%':   { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.96)' },
        },
        // Aurora sweep for celebrations
        'aurora-sweep': {
          '0%':   { transform: 'translateX(-100%) skewX(-15deg)', opacity: '0' },
          '30%':  { opacity: '0.8' },
          '70%':  { opacity: '0.6' },
          '100%': { transform: 'translateX(200%) skewX(-15deg)', opacity: '0' },
        },
        // Glass shimmer for active surfaces
        'glass-shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '300% center' },
        },
        // Scale journey zoom-out
        'scale-journey': {
          '0%':   { transform: 'scale(1)', opacity: '1' },
          '30%':  { transform: 'scale(0.85)', opacity: '0.95' },
          '70%':  { transform: 'scale(0.6)', opacity: '0.9' },
          '100%': { transform: 'scale(0.42)', opacity: '0.85' },
        },
        // World particle float
        'particle-float': {
          '0%':   { transform: 'translateY(0) translateX(0)', opacity: '0.9' },
          '100%': { transform: 'translateY(-40px) translateX(8px)', opacity: '0' },
        },
        // Construction crane swing
        'crane-swing': {
          '0%, 100%': { transform: 'rotate(-8deg)' },
          '50%':      { transform: 'rotate(8deg)' },
        },
        // Worker walk cycle (translate right)
        'walk-right': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(60px)' },
        },
        'walk-left': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-60px)' },
        },
        // Day/night sky blend
        'daynight': {
          '0%, 100%':   { opacity: '0' },       // day
          '40%, 60%':   { opacity: '1' },       // night peak
          '35%':        { opacity: '0.7' },
          '65%':        { opacity: '0.7' },
        },
        // Window lighting flicker (random on/off at night)
        'window-night': {
          '0%, 100%': { opacity: '0.05' },
          '40%, 60%': { opacity: '0.9' },
          '30%':      { opacity: '0.3' },
          '70%':      { opacity: '0.7' },
        },
        // Celebration burst
        'burst': {
          '0%':   { transform: 'scale(0)', opacity: '1' },
          '60%':  { transform: 'scale(1.4)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        // Rival edge flash (red screen edge on threat)
        'edge-flash': {
          '0%, 100%': { opacity: '0' },
          '15%, 85%': { opacity: '0.6' },
        },
        // Expression swap (quick fade-out and back in)
        'expr-swap': {
          '0%':   { opacity: '1' },
          '30%':  { opacity: '0', transform: 'scale(0.95)' },
          '70%':  { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'char-enter-left':  'char-enter-left 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'char-enter-right': 'char-enter-right 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'char-exit-left':   'char-exit-left 0.35s ease-in forwards',
        'char-exit-right':  'char-exit-right 0.30s ease-in forwards',
        'char-breathe':     'char-breathe 4.5s ease-in-out infinite',
        'emote-pop':        'emote-pop 1.4s ease-out forwards',
        'dialogue-reveal':  'dialogue-reveal 0.28s ease 0.18s both',
        'cursor-blink':     'cursor-blink 0.9s ease-in-out infinite',
        'iris-in':          'iris-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'iris-out':         'iris-out 0.5s ease-in forwards',
        'wipe-reveal':      'wipe-reveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'cam-push':         'cam-push 8s ease-in-out infinite alternate',
        'cam-pull':         'cam-pull 6s ease-in-out forwards',
        'aurora-sweep':     'aurora-sweep 2.2s ease-in-out forwards',
        'glass-shimmer':    'glass-shimmer 2.5s linear infinite',
        'scale-journey':    'scale-journey 4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'particle-float':   'particle-float 2.8s ease-out forwards',
        'crane-swing':      'crane-swing 3.5s ease-in-out infinite',
        'walk-right':       'walk-right 8s linear infinite',
        'walk-left':        'walk-left 8s linear infinite',
        'daynight':         'daynight 240s ease-in-out infinite',
        'window-night':     'window-night 240s ease-in-out infinite',
        'burst':            'burst 0.6s ease-out forwards',
        'edge-flash':       'edge-flash 1.4s ease-in-out',
        'expr-swap':        'expr-swap 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
};
