/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // a separate build folder lets a production build run next to the dev server
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // the validation route reads the dataset from disk, so ship it with that serverless function (Vercel)
  outputFileTracingIncludes: { "/api/bench/validate": ["./public/bench/tasks.json"] },
};
export default nextConfig;
