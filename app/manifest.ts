import type { MetadataRoute } from "next"
import { brandDescription, siteName, siteUrl } from "@/lib/seo/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "FitPro",
    description: brandDescription,
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a0a12",
    theme_color: "#0a0a12",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "productivity", "fitness", "health"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    id: siteUrl,
  }
}
