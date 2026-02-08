/** @type {import('next').NextConfig} */
process.env.NEXT_FONT_GOOGLE_DISABLE_DOWNLOADS = '1';

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
