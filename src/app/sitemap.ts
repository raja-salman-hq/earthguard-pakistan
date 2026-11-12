import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL("/", siteUrl).toString(), priority: 1, changeFrequency: "monthly" },
    { url: new URL("/explore", siteUrl).toString(), priority: 0.9, changeFrequency: "monthly" },
    { url: new URL("/compare", siteUrl).toString(), priority: 0.8, changeFrequency: "monthly" },
    { url: new URL("/about", siteUrl).toString(), priority: 0.7, changeFrequency: "monthly" },
    { url: new URL("/team", siteUrl).toString(), priority: 0.6, changeFrequency: "monthly" },
  ];
}
