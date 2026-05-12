import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taprooster — OJC Walhalla",
    short_name: "Taprooster",
    description: "Het taprooster van OJC Walhalla, Sevenum",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f0d1a",
    theme_color: "#0f0d1a",
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon-pwa?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-pwa?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
