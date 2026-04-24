/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /* ── Exact tokens from DESIGN.md + mockup Tailwind config ── */
      colors: {
        'background':                 '#0d1512',
        'surface':                    '#0d1512',
        'surface-dim':                '#0d1512',
        'surface-bright':             '#333b37',
        'surface-container-lowest':   '#08100d',
        'surface-container-low':      '#161d1a',
        'surface-container':          '#19211e',
        'surface-container-high':     '#242c28',
        'surface-container-highest':  '#2f3633',
        'surface-variant':            '#2f3633',
        'surface-tint':               '#28dfb5',
        'on-surface':                 '#dce4df',
        'on-surface-variant':         '#bacac2',
        'inverse-surface':            '#dce4df',
        'inverse-on-surface':         '#2a322f',
        'outline':                    '#85948d',
        'outline-variant':            '#3b4a44',
        'primary':                    '#46f1c5',
        'on-primary':                 '#00382b',
        'primary-container':          '#00d4aa',
        'on-primary-container':       '#005643',
        'inverse-primary':            '#006b55',
        'primary-fixed':              '#55fcd0',
        'primary-fixed-dim':          '#28dfb5',
        'on-primary-fixed':           '#002118',
        'on-primary-fixed-variant':   '#00513f',
        'secondary':                  '#caffea',
        'on-secondary':               '#00382b',
        'secondary-container':        '#00f3c2',
        'on-secondary-container':     '#006a53',
        'secondary-fixed':            '#28ffcd',
        'secondary-fixed-dim':        '#00e0b3',
        'on-secondary-fixed':         '#002118',
        'on-secondary-fixed-variant': '#00513f',
        'tertiary':                   '#ffcea6',
        'on-tertiary':                '#4c2700',
        'tertiary-container':         '#ffa858',
        'on-tertiary-container':      '#733e00',
        'tertiary-fixed':             '#ffdcc1',
        'tertiary-fixed-dim':         '#ffb77a',
        'on-tertiary-fixed':          '#2e1500',
        'on-tertiary-fixed-variant':  '#6c3a00',
        'error':                      '#ffb4ab',
        'on-error':                   '#690005',
        'error-container':            '#93000a',
        'on-error-container':         '#ffdad6',
        /* convenience aliases */
        'on-background':              '#dce4df',
      },

      fontFamily: {
        sans:     ['Inter', 'system-ui', 'sans-serif'],
        body:     ['Inter', 'system-ui', 'sans-serif'],
        heading:  ['Inter', 'system-ui', 'sans-serif'],
        metadata: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        metadata: ['12px', { lineHeight: '1.2', letterSpacing: '0.01em',  fontWeight: '400' }],
        body:     ['15px', { lineHeight: '1.6', letterSpacing: '0em',     fontWeight: '400' }],
        heading:  ['18px', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
      },

      spacing: {
        xs:                '4px',
        sm:                '8px',
        base:              '8px',
        md:                '16px',
        lg:                '24px',
        xl:                '32px',
        gutter:            '16px',
        'container-padding':'24px',
      },

      borderRadius: {
        DEFAULT: '0.25rem',
        sm:      '0.25rem',
        md:      '0.5rem',
        lg:      '0.75rem',
        xl:      '1rem',
        '2xl':   '1.5rem',
        full:    '9999px',
      },

      animation: {
        'fade-up':    'fadeUp 0.35s ease-out forwards',
        'scan-pulse': 'scanPulse 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.8s ease-in-out infinite',
        'float':      'float 3s ease-in-out infinite',
      },

      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scanPulse: {
          '0%':   { boxShadow: '0 0 0 0 rgba(0,212,170,0.5)' },
          '70%':  { boxShadow: '0 0 0 14px rgba(0,212,170,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0,212,170,0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },

      maxWidth: { chat: '768px' },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
