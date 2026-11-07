import AboutContent from "./about-content";
import { getPageMetadata } from "@/lib/site-metadata";

export const metadata = getPageMetadata("about");

export default function AboutPage() {
  return <AboutContent />;
}
