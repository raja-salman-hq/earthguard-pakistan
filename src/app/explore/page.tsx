import ExploreWorkspace from "./explore-workspace";
import { getPageMetadata } from "@/lib/site-metadata";

export const metadata = getPageMetadata("explore");

export default function ExplorePage() {
  return <ExploreWorkspace />;
}
