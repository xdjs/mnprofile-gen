/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-red-600',
    'hover:bg-red-700',
    'focus:ring-red-500',
    'text-white'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} 