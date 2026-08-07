import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7C3AED", // Royal Purple
          light: "#A78BFA",
          dark: "#6D28D9",
        },
        accent: {
          DEFAULT: "#14B8A6", // Teal
          light: "#2DD4BF",
          dark: "#0F766E",
        },
        customGray: {
          light: "#f8fafc", // Slate-50 Background
          card: "#ffffff",
          border: "#e2e8f0",
          hover: "#f5f3ff", // Soft Purple Hover
          muted: "#64748b",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Sora", "sans-serif"],
      },
      boxShadow: {
        premium: "0 8px 30px rgba(124, 58, 237, 0.03)",
        glass: "0 8px 32px 0 rgba(124, 58, 237, 0.05)",
      },
      borderRadius: {
        premium: "16px",
      }
    },
  },
  plugins: [],
};
export default config;
