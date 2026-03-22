/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        surface: 'rgba(17, 24, 39, 0.4)',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#3b82f6',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        'text-primary': '#f9fafb',
        'text-muted': '#9ca3af',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.3)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}
