export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { navy: { 950: '#07111f', 900: '#0b1b33', 800: '#12284a', 700: '#1b3a66' }, hazard: '#ffc20e' },
      fontFamily: { display: ['"Barlow Condensed"', 'Impact', 'sans-serif'], sans: ['Barlow', 'system-ui', 'sans-serif'] },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { from: { opacity: 0, transform: 'scale(.96)' }, to: { opacity: 1, transform: 'none' } },
        slidein: { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        drop: { from: { opacity: 0, transform: 'translateY(-16px)' }, to: { opacity: 1, transform: 'none' } },
        sway: { '0%,100%': { transform: 'rotate(-1.4deg)' }, '50%': { transform: 'rotate(1.4deg)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        ring: { '0%': { boxShadow: '0 0 0 0 rgba(255,194,14,.55)' }, '100%': { boxShadow: '0 0 0 16px rgba(255,194,14,0)' } },
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: .2 } },
      },
      animation: { rise: 'rise .35s ease-out both', pop: 'pop .2s ease-out both', slidein: 'slidein .25s ease-out both', fade: 'fade .2s ease-out both', drop: 'drop .5s ease-out both', sway: 'sway 8s ease-in-out infinite', float: 'float 3.5s ease-in-out infinite', ring: 'ring 2.4s ease-out infinite', blink: 'blink 1.8s ease-in-out infinite' },
    },
  },
}
