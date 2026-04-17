/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        coral: {
          50:  "#FFF0F0",
          100: "#FFCDD0",
          200: "#FF9DA2",
          400: "#FF7B80",
          500: "#FF5A5F",
          600: "#E04045",
          700: "#C0282D",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Noto Sans KR"',
          "sans-serif",
        ],
      },
      boxShadow: {
        glass:    "0 8px 32px rgba(31,41,55,0.10), 0 1px 3px rgba(31,41,55,0.06)",
        "glass-lg": "0 20px 60px rgba(31,41,55,0.16), 0 4px 12px rgba(31,41,55,0.08)",
        float:    "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
        card:     "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
