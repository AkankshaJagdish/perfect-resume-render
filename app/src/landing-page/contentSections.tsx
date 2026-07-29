import daBoiAvatar from "../client/static/da-boi.webp";
import kivo from "../client/static/examples/kivo.webp";
import messync from "../client/static/examples/messync.webp";
import microinfluencerClub from "../client/static/examples/microinfluencers.webp";
import promptpanda from "../client/static/examples/promptpanda.webp";
import reviewradar from "../client/static/examples/reviewradar.webp";
import scribeist from "../client/static/examples/scribeist.webp";
import searchcraft from "../client/static/examples/searchcraft.webp";
import type { GridFeature } from "./components/FeaturesGrid";

export const features: GridFeature[] = [
  {
    name: "Tailor every application",
    description:
      "Turn one master resume into a role-specific version that highlights the experience each job asks for.",
    emoji: "🎯",
    href: "#features",
    size: "large",
  },
  {
    name: "ATS-friendly formatting",
    description:
      "Keep the structure clean, readable, and easy for applicant tracking systems to parse.",
    emoji: "✅",
    href: "#features",
    size: "medium",
  },
  {
    name: "Professional PDF output",
    description:
      "Download a polished PDF that is ready to attach to your next application.",
    emoji: "📄",
    href: "#features",
    size: "medium",
  },
  {
    name: "Under a minute",
    description:
      "Upload, paste the job description, and generate an optimized resume without manually rewriting every bullet.",
    emoji: "⚡",
    href: "#features",
    size: "large",
  },
];

export const testimonials = [
  {
    name: "PerfectResume Creator",
    role: "Why this exists",
    avatarSrc: daBoiAvatar,
    socialUrl: "https://perfectresume.app",
    quote:
      "Every application deserves its own resume. PerfectResume makes creating one take under a minute, with uploaded resumes processed only to generate your optimized version and not permanently stored.",
  },
];

export const faqs = [
  {
    id: 1,
    question: "How many resumes are included?",
    answer:
      "Starter includes 10 optimized resume generations per month, plus one free trial generation before subscribing.",
    href: "#pricing",
  },
  {
    id: 2,
    question: "Can I upload my existing resume?",
    answer:
      "Yes. Upload a PDF, DOCX, or TXT resume, paste the target job description, and generate a tailored PDF.",
    href: "#features",
  },
];

export const footerNavigation = {
  app: [
    { name: "Resume", href: "/resume-optimizer" },
    { name: "Pricing", href: "/pricing" },
  ],
  company: [],
};

export const examples = [
  {
    name: "Example #1",
    description: "Describe your example here.",
    imageSrc: kivo,
    href: "#",
  },
  {
    name: "Example #2",
    description: "Describe your example here.",
    imageSrc: messync,
    href: "#",
  },
  {
    name: "Example #3",
    description: "Describe your example here.",
    imageSrc: microinfluencerClub,
    href: "#",
  },
  {
    name: "Example #4",
    description: "Describe your example here.",
    imageSrc: promptpanda,
    href: "#",
  },
  {
    name: "Example #5",
    description: "Describe your example here.",
    imageSrc: reviewradar,
    href: "#",
  },
  {
    name: "Example #6",
    description: "Describe your example here.",
    imageSrc: scribeist,
    href: "#",
  },
  {
    name: "Example #7",
    description: "Describe your example here.",
    imageSrc: searchcraft,
    href: "#",
  },
];
