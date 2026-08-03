export const brandConfig = {
  name: "PerfectResume",
  shortName: "ResumeAI",
  description:
    "AI-powered ATS-friendly resume optimization for software and technology jobs.",
  url: "https://perfectresume.app",
  faviconPath: "/result-right-icon-fav.ico",
  appIconPath: "/result-right-icon-fav.ico",
  logoAlt: "PerfectResume",
  socialPreviewImage: "/public-banner.webp",
  keywords:
    "technology resume, ATS resume, software engineering resume, resume optimizer, keyword optimization",
} as const;

export const landingContent = {
  hero: {
    eyebrow: "AI-powered ATS resume optimizer",
    headline: "Every application deserves its own resume",
    body: "PerfectResume makes creating one take under a minute with ATS-friendly keywords, professional wording, and clean formatting for each role.",
    primaryCta: "Optimize My Resume",
    secondaryCta: "View Pricing",
  },
  featuresTitle: "Built for technology resumes",
  featuresDescription:
    "Focus each application on the skills, keywords, and impact recruiters expect for software and technical roles.",
  features: [
    {
      name: "ATS readable",
      description:
        "Clean resume structure that Applicant Tracking Systems can parse.",
      emoji: "✅",
      href: "#features",
      size: "medium" as const,
    },
    {
      name: "Role-specific keywords",
      description:
        "Align your resume language with each target job description.",
      emoji: "🎯",
      href: "#features",
      size: "medium" as const,
    },
    {
      name: "Professional wording",
      description:
        "Turn rough bullets into concise, impact-focused resume language.",
      emoji: "✍️",
      href: "#features",
      size: "medium" as const,
    },
    {
      name: "Software roles",
      description:
        "Optimized for engineering, product, data, DevOps, and technical resumes.",
      emoji: "💻",
      href: "#features",
      size: "medium" as const,
    },
  ],
  creator: {
    title: "Created for job seekers who tailor every application",
    name: "PerfectResume Creator",
    role: "Creator",
    body: "PerfectResume was created after seeing how much time technical candidates spend rewriting resumes for each role. The goal is simple: save hours while keeping resumes clear, honest, and recruiter-ready.",
  },
  faq: [
    {
      id: 1,
      question: "What roles is this for?",
      answer:
        "PerfectResume is focused on software engineering, product, data, DevOps, IT, and other technology resumes.",
      href: "#features",
    },
    {
      id: 2,
      question: "What files can I upload?",
      answer:
        "Upload PDF, DOCX, or TXT resumes and paste a target job description.",
      href: "#features",
    },
  ],
  footer: {
    app: [
      { name: "Resume", href: "/resume-optimizer" },
      { name: "Pricing", href: "/pricing" },
    ],
    company: [],
  },
} as const;

export const pricingContent = {
  heading: "Affordable resume optimization",
  subheading:
    "Start with one free generation, then subscribe to Starter for 10 optimized technology resumes per month.",
  starter: {
    name: "Starter",
    price: "$5.99",
    interval: "/month",
    description:
      "10 optimized resumes per month for software and technology jobs",
    features: [
      "10 optimized resumes per month",
      "One free trial generation before subscribing",
      "ATS-friendly formatting",
      "Professional PDF downloads",
    ],
    ctaAuthenticated: "Subscribe to Starter",
    ctaAnonymous: "Log in to subscribe",
  },
} as const;
