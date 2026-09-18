import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#171B26',
        paper: '#EDEFF3',
        ink: '#1A1F2E',
        emerald: '#2F6F62',
        ochre: '#C08A2E',
        hairline: '#D3D7E0',
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'sans-serif'],
      },
      maxWidth: {
        board: '480px',
      },
    },
  },
  plugins: [],
};

export default config;
