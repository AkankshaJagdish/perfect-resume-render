import { type App } from "@wasp.sh/spec";
import { brandConfig } from "../siteConfig";

const absoluteImageUrl = `${brandConfig.url}${brandConfig.socialPreviewImage}`;

export const head: App["head"] = [
  `<link rel='icon' href='${brandConfig.faviconPath}' />`,
  `<link rel='apple-touch-icon' href='${brandConfig.appIconPath}' />`,

  `<meta name='description' content='${brandConfig.description}' />`,
  `<meta name='author' content='${brandConfig.name}' />`,
  `<meta name='keywords' content='${brandConfig.keywords}' />`,

  "<meta property='og:type' content='website' />",
  `<meta property='og:title' content='${brandConfig.name}' />`,
  `<meta property='og:site_name' content='${brandConfig.name}' />`,
  `<meta property='og:url' content='${brandConfig.url}' />`,
  `<meta property='og:description' content='${brandConfig.description}' />`,
  `<meta property='og:image' content='${absoluteImageUrl}' />`,
  `<meta name='twitter:image' content='${absoluteImageUrl}' />`,
  "<meta name='twitter:image:width' content='800' />",
  "<meta name='twitter:image:height' content='400' />",
  "<meta name='twitter:card' content='summary_large_image' />",
];
