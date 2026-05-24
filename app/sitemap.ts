import type { MetadataRoute } from "next"
import { publicRoutes, siteUrl } from "@/lib/seo/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
