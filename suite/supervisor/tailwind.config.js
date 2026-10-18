export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { navy: { 950: '#050d1c', 900: '#0a1730', 800: '#10224a' }, bv: { yellow: '#ffc800', yellow2: '#ffd83a' } },
      fontFamily: { display: ['"Barlow Condensed"', 'Oswald', 'Arial Narrow', 'sans-serif'], body: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};
