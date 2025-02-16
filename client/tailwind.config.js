/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        'glow': '0 0 15px -3px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 25px -5px rgba(59, 130, 246, 0.4)',
        'profit': '0 0 15px -3px rgba(74, 222, 128, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-out': 'slideOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'fade-out': 'fadeOut 0.2s ease-out forwards',
        'pulse-glow': 'pulseGlow 1.5s ease-in-out infinite',
        'profit-flash': 'profitFlash 0.5s ease-in-out',
        'scale-up': 'scaleUp 0.2s ease-out forwards',
        'progress-bar': 'progress 1s linear forwards',
        'toast-enter': 'toast 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards',
        'toast-exit': 'toast 0.2s cubic-bezier(0.06, 0.71, 0.55, 1) reverse forwards'
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '60%': { transform: 'translateX(-10%)', opacity: '0.8' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 5px 0 rgba(59, 130, 246, 0.3)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 20px 0 rgba(59, 130, 246, 0.4)',
            transform: 'scale(1.02)',
          },
        },
        profitFlash: {
          '0%': {
            transform: 'scale(0.9)',
            opacity: '0',
          },
          '60%': {
            transform: 'scale(1.1)',
            opacity: '0.9',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        toast: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(1rem) scale(0.95)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          },
        },
        progress: {
          '0%': { transform: 'scaleX(1)' },
          '100%': { transform: 'scaleX(0)' },
        },
      },
      translate: {
        'full-plus': '110%',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.glass-effect': {
          'background': 'rgba(17, 24, 39, 0.7)',
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          'transition': 'all 0.3s ease',
        },
        '.toast-slide-in': {
          'transform': 'translateX(0)',
          'opacity': '1',
          'transition': 'all 0.3s cubic-bezier(0.21, 1.02, 0.73, 1)',
        },
        '.toast-slide-out': {
          'transform': 'translateX(calc(100% + 1rem))',
          'opacity': '0',
          'transition': 'all 0.2s cubic-bezier(0.06, 0.71, 0.55, 1)',
        },
      });
    },
  ],
};
