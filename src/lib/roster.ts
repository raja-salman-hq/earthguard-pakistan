// import { z } from "../../node_modules/zod/v4/classic/external.d.cts";
import type { z } from "zod";
import { teamMemberSchema } from "./team";

export const roster = [
  {
    id: "ayesha",
    name: "Ayesha",
    role: "Project Lead & Coordinator",
    description: "Project planning, team coordination, requirements, documentation, integration and final presentation",
    photo: null,
    github: "https://github.com/Ayeshamazhar12",
    linkedin: "https://www.linkedin.com/in/ayesha-mazhar-6a962a336",
  },
  {
    id: "hasnain",
    name: "Hasnain",
    role: "Earth Observation Data Analyst",
    description: "NASA satellite datasets, Google Earth Engine processing, data extraction and quality validation",
    photo: null,
    github: "https://github.com/Hasnain-php-dev",
    linkedin: "https://www.linkedin.com/in/muhammad-hasnain-779389365",
  },
  {
    id: "wani",
    name: "Wani",
    role: "Lead Data Scientist",
    description: "Data cleaning, temporal trend analysis, Mann-Kendall test, Sen's slope and statistical findings",
    photo: null,
    github: "https://github.com/MuhammadFaheeem37",
    linkedin: null,
  },
  {
    id: "sharjeel",
    name: "Sharjeel",
    role: "GIS & Spatial Data Scientist",
    description: "GIS mapping, land-cover analysis, spatial statistics and support for data science validation",
    photo: null,
    github: "https://github.com/SharjeelAhmed",
    linkedin: "https://www.linkedin.com/in/sharjeel-ahmed-73467839a/",
  },
  {
    id: "salman",
    name: "Raja Salman",
    role: "Backend & Dashboard Developer",
    description: "Backend development, data integration and dashboard functionality",
    photo: "/team/salman.png",
    github: "https://github.com/raja-salman-hq",
    linkedin: "https://www.linkedin.com/in/raja-salman-73467839a/",
  },
  {
    id: "ali",
    name: "Ali",
    role: "Cybersecurity & QA Analyst",
    description: "Website testing, data validation, basic security review and bug reporting",
    photo: null,
    github: "https://github.com/syedali7025",
    linkedin: "https://www.linkedin.com/in/sahzjr/",
  },
] satisfies z.input<typeof teamMemberSchema>[];
