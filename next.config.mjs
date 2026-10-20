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
  serverExternalPackages: ["xadesjs", "xmldsigjs", "xml-core", "@xmldom/xmldom", "xpath", "@peculiar/webcrypto", "node-forge"],
};

export default nextConfig;
