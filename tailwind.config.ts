import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Mobile-first: optimized for thumb zones
      spacing: {
        'thumb': '44px', // Minimum touch target
      },
    },
  },
  plugins: [],
};

export default config;
