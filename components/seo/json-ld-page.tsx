type JsonLdPageProps = {
  data: Record<string, unknown>
}

export function JsonLdPage({ data }: JsonLdPageProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
