import HomeContent from "./home-content";
import { getPageMetadata } from "@/lib/site-metadata";

export const metadata = getPageMetadata("home");

export default function HomePage() {
  return <HomeContent />;
}
