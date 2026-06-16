/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: "#e8eef5",
          100: "#c5d4e5",
          200: "#9db6d3",
          300: "#7598c0",
          400: "#5880b2",
          500: "#3b68a4",
          600: "#35609c",
          700: "#2d5591",
          800: "#264b87",
          900: "#1e3a5f",
          950: "#152a44",
        },
        status: {
          draft: "#6b7280",
          pending: "#f59e0b",
          pending_dept: "#f59e0b",
          pending_leader: "#d97706",
          approved: "#10b981",
          rejected: "#ef4444",
          registered: "#0ea5e9",
          cancelled: "#6b7280",
        },
        seal: {
          stored: "#10b981",
          in_use: "#f59e0b",
          warning: "#f97316",
          expired: "#ef4444",
          locked: "#6b7280",
        },
        urgency: {
          normal: "#10b981",
          urgent: "#f59e0b",
          emergency: "#ef4444",
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#0ea5e9",
      },
      fontFamily: {
        sans: [
          "Noto Sans SC",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
