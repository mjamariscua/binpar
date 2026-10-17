import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone con solo las dependencias necesarias: la imagen de
  // Docker copia esa carpeta y no todo node_modules. Vercel lo ignora.
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
