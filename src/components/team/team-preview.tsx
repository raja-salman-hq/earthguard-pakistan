"use client";

import Link from "next/link";
import { useMessages } from "@/hooks/use-messages";
import { teamMembers } from "@/lib/team";
import { useUiStore } from "@/store/ui-store";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeamPreview() {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);

  return (
    <section
      className="team-preview"
      aria-labelledby="team-preview-title"
      dir={language === "ur" ? "rtl" : "ltr"}
    >
      <div className="team-preview-copy">
        <h2 id="team-preview-title">{messages.teamPreviewTitle}</h2>
        <ul className="team-preview-avatars" aria-label={messages.teamPreviewMembersLabel}>
          {teamMembers.map((member) => (
            <li key={member.id} title={member.name}>
              <span aria-hidden="true">{initials(member.name)}</span>
              <span className="sr-only">
                <bdi lang="en" dir="ltr">
                  {member.name}
                </bdi>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <Link className="team-preview-link" href="/team">
        {messages.teamPreviewButton}
      </Link>
    </section>
  );
}
