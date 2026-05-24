import type { MetadataRoute } from "next"
import { defaultDescription, siteName, siteUrl } from "@/lib/seo/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "FitPro",
    description: defaultDescription,
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a0a12",
    theme_color: "#0a0a12",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "productivity", "fitness"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    id: siteUrl,
  }
}
