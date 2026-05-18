/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Garante que a própria origem pode usar a câmera (evita bloqueio por policy em alguns ambientes).
          { key: "Permissions-Policy", value: "camera=(self), microphone=()" },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      // Evita 404 quando o navegador pede /favicon.ico explicitamente.
      { source: "/favicon.ico", destination: "/icon.svg" },
    ]
  },
}

export default nextConfig
