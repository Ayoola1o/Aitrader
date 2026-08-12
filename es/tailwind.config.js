/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090D16",
        card: "#111827",
        border: "#1F2937",
        bullish: "#10B981",
        bearish: "#EF4444",
        neutral: "#F59E0B",
        accent: "#3B82F6",
      },
    },
  },
  plugins: [],
};
