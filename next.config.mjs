// In local dev, proxy /api/* to the FastAPI server. On Vercel, api/index.py serves /api/*.
const nextConfig = {
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" }]
      : [];
  },
};
export default nextConfig;
