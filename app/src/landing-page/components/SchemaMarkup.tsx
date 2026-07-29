import { brandConfig, pricingContent } from "../../siteConfig";

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${brandConfig.url}/#software`,
      name: brandConfig.name,
      description: brandConfig.description,
      url: brandConfig.url,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Cross-platform",
      image: `${brandConfig.url}${brandConfig.socialPreviewImage}`,
      offers: {
        "@type": "Offer",
        price: pricingContent.starter.price.replace("$", ""),
        priceCurrency: "USD",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${brandConfig.url}/#website`,
      url: brandConfig.url,
      name: brandConfig.name,
      description: brandConfig.description,
    },
  ],
};

export function SchemaMarkup() {
  return <script type="application/ld+json">{JSON.stringify(schema)}</script>;
}
