/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow loading images from IPFS gateways
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      { protocol: "https", hostname: "ipfs.io" },
    ],
  },
  webpack: (config) => {
    config.externals.push(
      'pino-pretty',
      'lokijs',
      'encoding',
      /@x402\/.*/
    );
    return config;
  },
};

module.exports = nextConfig;
