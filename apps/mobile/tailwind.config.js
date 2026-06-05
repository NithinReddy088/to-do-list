/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        background: "#FFFFFF",
        surface: "#F8FAFC",
        text: "#1B2533",
        muted: "#697483",
        border: "#E5E7EB",
        success: "#16A34A",
        danger: "#DC2626",
      },
    },
  },
  plugins: [],
};
