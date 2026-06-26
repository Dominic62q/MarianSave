import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "0 0% 100%",
          muted: "0 0% 100% / 0.6",
          accent: "0 0% 100% / 0.08",
        },
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.75rem",
      },
      boxShadow: {
        panel: "0 18px 50px -24px rgba(15, 23, 42, 0.22)",
      },
      backgroundImage: {
        "app-grid":
          "linear-gradient(to right, rgba(148, 163, 184, 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.09) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
