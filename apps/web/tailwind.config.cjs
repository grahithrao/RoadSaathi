/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F5FAFF',
          surface: '#DBEAFE',
          primary: '#2563EB',
          primaryHover: '#1D4ED8',
          dark: '#0F172A',
          muted: '#475569',
        },
      },
    },
  },
  plugins: [],
};
