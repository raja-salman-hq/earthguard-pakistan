import { TeamSection } from "@/components/team/team-section";
import { getPageMetadata } from "@/lib/site-metadata";

export const metadata = getPageMetadata("team");

export default function TeamPage() {
  return <TeamSection />;
}
