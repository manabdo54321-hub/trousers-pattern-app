/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // خط عربي واضح للواجهة، مع fallback لخطوط النظام
        arabic: ['"Cairo"', '"Tajawal"', 'sans-serif'],
      },
      colors: {
        // ألوان متطابقة مع ألوان خطوط الباترون في الباك إند، لربط بصري موحّد
        'pattern-blue': '#1e3799',
        'pattern-green': '#2ed573',
        'pattern-red': '#eb2f06',
        'pattern-gray': '#747d8c',
      },
    },
  },
  plugins: [],
}
