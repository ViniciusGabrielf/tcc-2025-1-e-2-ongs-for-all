/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ativar classe para tema escuro
  content: ['./src/**/*.{ts,hbs}', './views/**/*.hbs'],

  theme: {
    extend: {
      keyframes: {
        'fade-slide': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-slide': 'fade-slide 0.5s ease-out forwards'
      }
    }
  },
  plugins: []
}
