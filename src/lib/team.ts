import { Rss } from "lucide-react";
 // not: import { teamMemberSchema }
import { z } from "zod";
import { roster } from "./roster";

const photoSchema = z
  .string()
  .regex(/^\/team\/[a-z0-9-]+\.(?:jpg|png|webp)$/)
  .nullable();

const socialUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["github.com", "www.github.com", "linkedin.com", "www.linkedin.com"].includes(
        url.hostname,
      )
    );
  })
  .nullable();

export const teamMemberSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    role: z.string().min(1),
    description: z.string().min(1),
    photo: photoSchema,
    github: socialUrlSchema,
    linkedin: socialUrlSchema,
    roleUr: z.string().optional(),
    descriptionUr: z.string().optional(),
  })
  .refine(
    ({ id, photo }) => photo === null || photo.slice(6, photo.lastIndexOf(".")) === id,
    { path: ["photo"] },
  );

export const teamMembersSchema = z.array(teamMemberSchema);
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const teamMembers = teamMembersSchema.parse(roster);
