/** @type {import('next').NextConfig} */
process.env.NEXT_FONT_GOOGLE_DISABLE_DOWNLOADS = "1";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cwzpxxahtayoyqqskmnt.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
