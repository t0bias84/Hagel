/** @type {import('tailwindcss').Config} */
export default {
  // Gör att Tailwind kan växla till “dark mode” när du lägger en .dark-klass
  darkMode: ["class"],

  // Talar om för Tailwind var källfilerna ligger (justera vid behov)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],

  // Prefix: Om du vill ha unika prefix (ex. “tw-”), annars lämna tom
  prefix: "",

  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Dina egna färger
      colors: {
        // Några neutrala
        border: "rgb(229, 231, 235)",
        background: "rgb(249, 250, 251)",
        foreground: "rgb(17, 24, 39)",

        // Primär & sekundär
        primary: {
          DEFAULT: "rgb(59, 130, 246)",
          foreground: "#ffffff",
          hover: "rgb(37, 99, 235)",
        },
        secondary: {
          DEFAULT: "rgb(243, 244, 246)",
          foreground: "rgb(55, 65, 81)",
          hover: "rgb(229, 231, 235)",
        },
        destructive: {
          DEFAULT: "rgb(239, 68, 68)",
          foreground: "#ffffff",
          hover: "rgb(220, 38, 38)",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "rgb(17, 24, 39)",
        },
        muted: {
          DEFAULT: "rgb(243, 244, 246)",
          foreground: "rgb(107, 114, 128)",
        },

        // Discord-färger (exempel)
        discordBg: "#2c2f33",
        discordSidebar: "#23272a",
        discordText: "#ffffff",
        discordPrimary: "#5865f2",
        discordHover: "#40444b",

        // Militärgrön palett
        military: {
          50:  "#f8faf8",
          100: "#eef2ee",
          200: "#d4dcd4",
          300: "#bac7ba",
          400: "#869a86",
          500: "#677167", // justera om du vill
          600: "#5e675e",
          700: "#4e574e",
          800: "#363d36",
          900: "#202520",
        },
      },

      // Här kan du lägga in t.ex. custom fonts, spacing etc.
      // Exempel:
      // fontFamily: {
      //   sans: ['Inter', 'sans-serif'],
      // },
      // spacing: {
      //   '128': '32rem',
      // },
    },
  },

  // Exempel på plugins
  plugins: [
    require('@tailwindcss/line-clamp'),
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
};
