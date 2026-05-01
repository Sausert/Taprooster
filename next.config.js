/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],

  // Voorkomt dat Next.js Windows systeembestanden probeert te scannen
  watchOptions: {
    ignored: ["**/node_modules/**", "C:\\pagefile.sys", "C:\\hiberfil.sys", "C:\\swapfile.sys", "C:\\DumpStack.log.tmp"],
  },

  // Staat toegang toe vanaf andere apparaten in je netwerk (bijv. via IP)
  allowedDevOrigins: ["192.168.2.12"],
};

module.exports = nextConfig;
