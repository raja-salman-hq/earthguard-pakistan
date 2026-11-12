"use client";

import Image from "next/image";
import { useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import { teamMembers, type TeamMember } from "@/lib/team";
import { useUiStore } from "@/store/ui-store";

type TeamMessages = ReturnType<typeof useMessages>;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatName(template: string, name: string): string {
  return template.replace("{name}", name);
}

function renderName(template: string, name: string) {
  const [before, after = ""] = template.split("{name}");
  return (
    <>
      {before}
      <bdi lang="en" dir="ltr">
        {name}
      </bdi>
      {after}
    </>
  );
}

function TeamPortrait({
  member,
  variant,
  messages,
}: {
  member: TeamMember;
  variant: "card" | "dialog";
  messages: TeamMessages;
}) {
  return (
    <div className={`team-portrait team-portrait-${variant}`}>
      {member.photo ? (
        <Image
          className="team-portrait-image"
          src={member.photo}
          width={variant === "card" ? 112 : 240}
          height={variant === "card" ? 112 : 240}
          sizes={variant === "card" ? "112px" : "(max-width: 600px) 180px, 240px"}
          alt={formatName(messages.teamPhotoAlt, member.name)}
          loading="lazy"
        />
      ) : (
        <span className="team-portrait-initials" aria-hidden="true">
          {initials(member.name)}
        </span>
      )}
    </div>
  );
}

function SocialIcon({ network }: { network: "github" | "linkedin" }) {
  if (network === "github") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.68-3.76-1.32-3.76-1.32-.5-1.3-1.24-1.65-1.24-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1.5 2.26 3.6 1.61.1-.73.39-1.23.7-1.51-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.16-3-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.1-1.45 3.04-1.15 3.04-1.15.61 1.54.23 2.68.12 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.61 5.23-5.1 5.51.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M20.45 2H3.55C2.69 2 2 2.68 2 3.53v16.94c0 .85.69 1.53 1.55 1.53h16.9c.86 0 1.55-.68 1.55-1.53V3.53c0-.85-.69-1.53-1.55-1.53ZM7.93 18.88H4.99V9.4h2.94v9.48ZM6.46 8.1a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4Zm12.42 10.78h-2.94v-4.61c0-1.1-.02-2.52-1.53-2.52-1.53 0-1.77 1.19-1.77 2.44v4.69H9.7V9.4h2.82v1.29h.04c.39-.74 1.35-1.53 2.78-1.53 2.97 0 3.54 1.96 3.54 4.5v5.22Z"
      />
    </svg>
  );
}

function MemberLinks({
  member,
  messages,
}: {
  member: TeamMember;
  messages: TeamMessages;
}) {
  const links = [
    { network: "github", href: member.github },
    { network: "linkedin", href: member.linkedin },
  ] as const;

  return (
    <div className="team-social-links">
      {links.map(({ network, href }) =>
        href ? (
          <a
            className="team-social-link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={formatName(
              network === "github" ? messages.teamGithubLabel : messages.teamLinkedinLabel,
              member.name,
            )}
            key={network}
          >
            <SocialIcon network={network} />
          </a>
        ) : null,
      )}
    </div>
  );
}

function TeamMemberCard({
  member,
  messages,
}: {
  member: TeamMember;
  messages: TeamMessages;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = `team-dialog-title-${member.id}`;

  return (
    <article className="team-member-card">
      <div className="team-card-heading">
        <TeamPortrait member={member} variant="card" messages={messages} />
        <div className="team-card-heading-copy">
          <h3 className="team-member-name">
            <bdi lang="en" dir="ltr">
              {member.name}
            </bdi>
          </h3>
          <p className="team-member-role" lang="en" dir="ltr">
            {member.role}
          </p>
        </div>
      </div>
      <p className="team-member-description" lang="en" dir="ltr">
        {member.description}
      </p>
      <div className="team-card-actions">
        <MemberLinks member={member} messages={messages} />
        <button
          className="team-view-profile"
          type="button"
          aria-haspopup="dialog"
          onClick={() => dialogRef.current?.showModal()}
        >
          {messages.teamViewProfile}
        </button>
      </div>
      <dialog
        className="team-profile-dialog"
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
      >
        <div className="team-dialog-content">
          <TeamPortrait member={member} variant="dialog" messages={messages} />
          <div className="team-dialog-copy">
            <h2 id={dialogTitleId}>
              {renderName(messages.teamDialogTitle, member.name)}
            </h2>
            <p className="team-member-role" lang="en" dir="ltr">
              {member.role}
            </p>
            <p className="team-member-description" lang="en" dir="ltr">
              {member.description}
            </p>
            <MemberLinks member={member} messages={messages} />
            <button
              className="team-dialog-close"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              {messages.teamCloseDialog}
            </button>
          </div>
        </div>
      </dialog>
    </article>
  );
}

export function TeamSection() {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);

  return (
    <main className="team-page page-shell" dir={language === "ur" ? "rtl" : "ltr"}>
      <header className="team-page-heading">
        <span className="eyebrow">{messages.teamEyebrow}</span>
        <h1>{messages.teamTitle}</h1>
        <p>{messages.teamSubtitle}</p>
      </header>
      <div className="team-member-grid">
        {teamMembers.map((member) => (
          <TeamMemberCard key={member.id} member={member} messages={messages} />
        ))}
      </div>
    </main>
  );
}
