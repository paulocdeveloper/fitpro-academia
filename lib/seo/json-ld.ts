import { brandDescription, defaultDescription, siteName, siteUrl } from "@/lib/seo/site"

/** Schema.org completo para Google Rich Results */
export function buildJsonLdGraph() {
  const logoUrl = `${siteUrl}/icon.svg`
  const ogImage = `${siteUrl}/opengraph-image`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
        },
        description: brandDescription,
        sameAs: [],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteName,
        description: defaultDescription,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "pt-BR",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/login`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: siteName,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Fitness & Gym Management",
        operatingSystem: "Web Browser",
        url: siteUrl,
        description: brandDescription,
        image: ogImage,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        },
        inLanguage: "pt-BR",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  }
}
