import { Rss } from "lucide-react";
import { z } from "zod";

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

const roster = [
  {
    id: "ayesha",
    name: "Ayesha",
    role: "Project Lead & Coordinator",
    description:
      "Project planning, team coordination, requirements, documentation, integration and final presentation",
    photo: null,
    github: null,
    linkedin: null,
  },
  {
    id: "hasnain",
    name: "Hasnain",
    role: "Earth Observation Data Analyst",
    description:
      "NASA satellite datasets, Google Earth Engine processing, data extraction and quality validation",
    photo: null,
    github: null,
    linkedin: null,
  },
  {
    id: "wani",
    name: "Wani",
    role: "Lead Data Scientist",
    description:
      "Data cleaning, temporal trend analysis, Mann-Kendall test, Sen's slope and statistical findings",
    photo: null,
    github: null,
    linkedin: null,
  },
  {
    id: "sharjeel",
    name: "Sharjeel",
    role: "GIS & Spatial Data Scientist",
    description:
      "GIS mapping, land-cover analysis, spatial statistics and support for data science validation",
    photo: null,
    github: null,
    linkedin: null,
  },
  {
    id: "salman",
    name: "Salman",
    role: "Backend & Dashboard Developer",
    description: "Backend development, data integration and dashboard functionality",
    photo: "/public/team/image-Rss.png",
    github: "https://github.com/raja-salman-hq",
    linkedin: "https://www.linkedin.com/in/raja-salman-73467839a/",
  },
  {
    id: "ali",
    name: "Ali",
    role: "Cybersecurity & QA Analyst",
    description: "Website testing, data validation, basic security review and bug reporting",
    photo: null,
    github: null,
    linkedin: null,
  },
] satisfies z.input<typeof teamMemberSchema>[];

export const teamMembers = teamMembersSchema.parse(roster);
