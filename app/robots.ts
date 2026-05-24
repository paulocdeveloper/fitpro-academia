import type { MetadataRoute } from "next"
import { privatePathPrefixes, siteUrl } from "@/lib/seo/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/login", "/cadastro"],
      disallow: privatePathPrefixes,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
