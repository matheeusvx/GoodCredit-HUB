/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        goodgreen: {
          50: "#edf8ef",
          100: "#d7efdc",
          200: "#b7dfbf",
          500: "#54a34c",
          600: "#3f8b3a",
          700: "#316d31"
        },
        goodblue: {
          50: "#edf6fb",
          100: "#d8ecf6",
          200: "#b5d9ea",
          500: "#2377a4",
          600: "#1d638b",
          700: "#184f70"
        }
      },
      boxShadow: {
        panel: "0 18px 55px rgba(18, 38, 63, 0.08)"
      }
    }
  },
  plugins: []
};
