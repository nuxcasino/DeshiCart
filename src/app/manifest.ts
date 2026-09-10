import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DeshiCart — Trendy Fashion for Bangladesh",
    short_name: "DeshiCart",
    description:
      "Trendy tees, sharp shirts and statement accessories — premium fabric, deshi soul.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6f0",
    theme_color: "#1b1611",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
