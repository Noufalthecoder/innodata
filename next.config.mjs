/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // a separate build folder lets a production build run next to the dev server
  // the validate route reads the task file from disk, so ship it with that serverless function
  outputFileTracingIncludes: { "/api/bench/validate": ["./public/bench/tasks.json"] },
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
