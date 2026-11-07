import CompareWorkspace from "./compare-workspace";
import { getPageMetadata } from "@/lib/site-metadata";

export const metadata = getPageMetadata("compare");

export default function ComparePage() {
  return <CompareWorkspace />;
}
