import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        papier: "#f3efe6",
        karta: "#fffdf8",
        atrament: "#1c1915",
        linia: "#d8d0c2",
        las: "#145c45",
        lasciemny: "#0e3d2e",
        burak: "#8d2b32",
        mosiadz: "#8a6232",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        kartka: "0 18px 50px rgba(60, 42, 20, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
