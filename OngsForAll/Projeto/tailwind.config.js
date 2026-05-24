/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ativar classe para tema escuro
  content: ['./src/**/*.{ts,hbs}', './views/**/*.hbs'],

  safelist: [
    // Célula do dia atual em dark mode
    'dark:bg-blue-900/40', 'dark:ring-1', 'dark:ring-inset', 'dark:ring-blue-500/50',
    // Badges dinâmicos do calendário (corClasse por tipo de evento)
    'bg-orange-100', 'text-orange-700', 'dark:bg-orange-900/40', 'dark:text-orange-300',
    'bg-lime-100',   'text-lime-700',   'dark:bg-lime-900/40',   'dark:text-lime-300',
    'bg-blue-100',   'text-blue-700',   'dark:bg-blue-900/40',   'dark:text-blue-300',
    'bg-green-100',  'text-green-700',  'dark:bg-green-900/40',  'dark:text-green-300',
    'bg-emerald-100','text-emerald-700','dark:bg-emerald-900/40','dark:text-emerald-300',
    'bg-teal-100',   'text-teal-700',   'dark:bg-teal-900/40',   'dark:text-teal-300',
    'bg-slate-100',  'text-slate-600',  'dark:bg-slate-700',     'dark:text-slate-300',
    'bg-purple-100', 'text-purple-700', 'dark:bg-purple-900/40', 'dark:text-purple-300',
    'bg-indigo-100', 'text-indigo-700', 'dark:bg-indigo-900/40', 'dark:text-indigo-300',
    'bg-violet-100', 'text-violet-700', 'dark:bg-violet-900/40', 'dark:text-violet-300',
    // Painel de eventos do calendário (HTML gerado via JS — não rastreável pelo scanner)
    'dark:bg-white/5', 'dark:hover:bg-white/10',
    'dark:border-white/5', 'dark:border-white/10',
    'dark:text-white/20', 'dark:text-white/30', 'dark:text-white/40',
    'dark:text-red-400',  'dark:text-blue-400',
    'last:border-0', 'animate-spin', 'opacity-25', 'opacity-75',
  ],

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
