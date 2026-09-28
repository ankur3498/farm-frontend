/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        farm: {
          50: "#f0f7ed",
          100: "#dcecd3",
          500: "#4c7a3e",
          600: "#3d6231",
          700: "#2f4c26",
          900: "#1c2e17",
        },
      },
    },
  },
  plugins: [],
};