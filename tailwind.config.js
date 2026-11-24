/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        // Brand green: deeper, less saturated, reads as "money" rather than "success toast".
        goodgreen: {
          50: "#eef7f1",
          100: "#d8eee1",
          200: "#b2dcc3",
          300: "#80c39d",
          400: "#4fa877",
          500: "#2f9461",
          600: "#1f7c4e",
          700: "#186440",
          800: "#134f33",
          900: "#0d3a26"
        },
        // Brand blue: navy ink used for structure, headings and data.
        goodblue: {
          50: "#eff4f8",
          100: "#dae6ef",
          200: "#b5cde0",
          300: "#8aafcb",
          400: "#5d8db2",
          500: "#386f98",
          600: "#295a7f",
          700: "#1f4766",
          800: "#17374f",
          900: "#10273a"
        },
        ink: {
          DEFAULT: "#0c1a26",
          soft: "#3b4a57",
          muted: "#6b7884"
        },
        canvas: "#f3f5f4"
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem"
      },
      boxShadow: {
        sm: "0 1px 2px rgba(12, 26, 38, 0.04), 0 1px 1px rgba(12, 26, 38, 0.03)",
        panel: "0 1px 2px rgba(12, 26, 38, 0.04), 0 8px 24px -12px rgba(12, 26, 38, 0.10)",
        lift: "0 2px 4px rgba(12, 26, 38, 0.05), 0 16px 32px -16px rgba(12, 26, 38, 0.22)"
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.36, 0.64, 1)"
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "roll-in": {
          from: { transform: "translateY(0.6em)", opacity: "0", filter: "blur(2px)" },
          to: { transform: "translateY(0)", opacity: "1", filter: "blur(0)" }
        },
        grow: {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" }
        }
      },
      animation: {
        rise: "rise 520ms cubic-bezier(0.22, 1, 0.36, 1) backwards",
        fade: "fade 320ms ease-out backwards",
        "roll-in": "roll-in 420ms cubic-bezier(0.22, 1, 0.36, 1) backwards",
        grow: "grow 700ms cubic-bezier(0.22, 1, 0.36, 1) backwards"
      }
    }
  },
  plugins: []
};
