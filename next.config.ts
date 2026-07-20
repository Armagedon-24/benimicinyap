import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    // Inline critical CSS and defer non-critical CSS to eliminate render blocking
    optimizeCss: true,
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
        ],
      },
      {
        source: "/icons/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
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