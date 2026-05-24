import { buildJsonLdGraph } from "@/lib/seo/json-ld"

export function JsonLdScript() {
  const graph = buildJsonLdGraph()
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
