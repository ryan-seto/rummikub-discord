/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rummikub: {
          red: '#E53E3E',
          blue: '#3182CE',
          yellow: '#ECC94B',
          black: '#2D3748',
          board: '#2C5F2D',
          boardLight: '#397D3B',
          rack: '#8B4513',
        }
      },
      animation: {
        'tile-flip': 'flip 0.6s ease-in-out',
        'tile-place': 'place 0.3s ease-out',
      },
      keyframes: {
        flip: {
          '0%, 100%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(180deg)' },
        },
        place: {
          '0%': { transform: 'scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
