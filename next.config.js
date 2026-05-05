/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],

  // Staat toegang toe vanaf andere apparaten in je netwerk (bijv. via IP)
  allowedDevOrigins: ["192.168.2.12"],
};

module.exports = nextConfig;
