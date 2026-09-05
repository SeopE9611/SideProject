/** @type {import('next').NextConfig} */
process.env.NEXT_FONT_GOOGLE_DISABLE_DOWNLOADS = "1";

const supabaseRemotePatterns = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];

  try {
    return [
      {
        protocol: "https",
        hostname: new URL(url).hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
})();

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    remotePatterns: supabaseRemotePatterns,
  },
};

export default nextConfig;
