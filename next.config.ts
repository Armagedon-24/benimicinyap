import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  // SQLite seed DB'sini Vercel lambda paketine dahil et (runtime /tmp kopyası için)
  outputFileTracingIncludes: {
    "/api/**": ["./db/custom.db"],
    "/**": ["./db/custom.db"],
  },
  typescript: {
    // Tip hataları artık build'i bloklar (güvenlik/kalite: hatalı kod yayınlanamaz)
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    // Inline critical CSS and defer non-critical CSS to eliminate render blocking
    optimizeCss: process.env.NODE_ENV === "production",
    // Tree-shake large packages — reduces unused JS
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons'],
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        // Add cache headers for static assets to reduce repeat load times
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/icons/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Kanıt görselleri: 1 gün cache
        source: "/proof/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        // Kimlik/ikon statikleri: 1 hafta cache
        source: "/:file(logo.svg|favicon.ico|og-image.png)",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/tasks', destination: '/?tab=tasks', permanent: true },
      { source: '/create', destination: '/?tab=create', permanent: true },
      { source: '/my-tasks', destination: '/?tab=my-tasks', permanent: true },
      { source: '/wallet', destination: '/?tab=wallet', permanent: true },
      { source: '/dashboard', destination: '/?tab=dashboard', permanent: true },
      { source: '/admin', destination: '/?tab=admin', permanent: true },
    ];
  },
};

export default nextConfig;