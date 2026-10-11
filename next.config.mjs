import path from "path";
import { fileURLToPath } from "url";

const katalog = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: katalog,
  turbopack: {
    root: katalog,
  },
};

export default nextConfig;
