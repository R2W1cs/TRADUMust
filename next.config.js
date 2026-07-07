/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async redirects() {
    return [{ source: "/recognize", destination: "/sign", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/asl-avatar/cwa/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/asl-avatar/cwa/shaders/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/asl-avatar/avatars/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/asl-avatar/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
    const aiUrl = process.env.NEXT_PUBLIC_AI_URL || "http://127.0.0.1:8001";

    return [
      { source: "/api/auth/:path*", destination: `${apiUrl}/api/auth/:path*` },
      { source: "/api/users/:path*", destination: `${apiUrl}/api/users/:path*` },
      { source: "/api/avatar/:path*", destination: `${apiUrl}/api/avatar/:path*` },
      { source: "/api/lessons/:path*", destination: `${apiUrl}/api/lessons/:path*` },
      { source: "/api/quizzes/:path*", destination: `${apiUrl}/api/quizzes/:path*` },
      { source: "/api/progress/:path*", destination: `${apiUrl}/api/progress/:path*` },
      { source: "/api/history/:path*", destination: `${apiUrl}/api/history/:path*` },
      { source: "/api/admin/:path*", destination: `${apiUrl}/api/admin/:path*` },
      { source: "/api/datasets/:path*", destination: `${apiUrl}/api/datasets/:path*` },
      { source: "/api/models/:path*", destination: `${apiUrl}/api/models/:path*` },
      { source: "/api/search/:path*", destination: `${apiUrl}/api/search/:path*` },
      { source: "/api/recognize/:path*", destination: `${apiUrl}/api/recognize/:path*` },
      { source: "/api/sign/:path*", destination: `${aiUrl}/api/sign/:path*` },
      { source: "/api/ml/:path*", destination: `${aiUrl}/api/ml/:path*` },
      { source: "/api/translate", destination: `${aiUrl}/api/translate` },
      { source: "/api/text-to-sign", destination: `${aiUrl}/api/text-to-sign` },
      { source: "/api/phrasebook/:path*", destination: `${aiUrl}/api/phrasebook/:path*` },
      { source: "/api/cultural-notes/:path*", destination: `${aiUrl}/api/cultural-notes/:path*` },
    ];
  },
};

module.exports = nextConfig;
