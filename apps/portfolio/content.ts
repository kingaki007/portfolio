// Edit this file: it is the only place with personal details.
export const base = process.env.NEXT_PUBLIC_BASE ?? "";

export const profile = {
  name: "Akshay Gajbhiya",
  role: "Full-Stack Engineer",
  tagline: "I build fast, expressive interfaces and the services behind them, and explain algorithms with motion.",
  github: "https://github.com/kingaki007",
  email: "akshay.gajbhiya79@gmail.com",
  phone: "+91-9986783147",
  // Put the PDF at apps/portfolio/public/Akshay_Gajbhiya_Resume.pdf
  resume: `${base}/Akshay_Gajbhiya_Resume.pdf`,
  summary:
    "Twelve years of shipping software, from pixel-level interfaces to platforms that seven teams build on. I started as a front-end engineer, grew into full-stack, and now put AI to work in the products I build and in how I build them.",
  metrics: [
    { value: "12+", label: "years building for the web" },
    { value: "7+", label: "teams on one micro-frontend platform" },
    { value: "300%", label: "more production deploys per month" },
    { value: "55%", label: "faster LCP on product pages" },
  ],
  stages: [
    {
      tag: "01",
      title: "Frontend",
      blurb:
        "Where it began. Architecting UI platforms in React, Angular and TypeScript, with an obsession for performance, accessibility and design systems that teams actually adopt.",
      points: ["Micro-frontends and monorepos", "Core Web Vitals and virtualization", "Shared component libraries"],
    },
    {
      tag: "02",
      title: "Full-stack",
      blurb:
        "Owning the whole path from browser to database. APIs, real-time systems and pipelines, so features ship end to end without hand-offs.",
      points: ["Node.js, Java (Spring Boot), Python (FastAPI)", "WebSockets and GraphQL", "MySQL and MongoDB data layers", "Jenkins, Grafana and observability"],
    },
    {
      tag: "03",
      title: "AI-enabled engineer",
      blurb:
        "Using LLMs as a force multiplier: integrating AI into products with tool calling and MCP, and working with coding agents to move faster without lowering the bar.",
      points: ["LLM and MCP integration", "Tool calling and AI-assisted coding", "Claude in the daily workflow"],
    },
  ],
  projects: [
    { title: "Algo Lab", blurb: "Step-by-step visual data structures and algorithms with synced code.", href: `${base}/algo/` },
    { title: "Full-stack project", blurb: "Coming soon. More full-stack projects will be added here.", href: "#" },
    { title: "Full-stack project", blurb: "Coming soon. More full-stack projects will be added here.", href: "#" },
  ],
  skills: [
    "TypeScript",
    "React",
    "Next.js",
    "Angular",
    "HTML",
    "CSS / Animation",
    "Node.js",
    "WebSockets",
    "Java (Spring Boot)",
    "Python (FastAPI)",
    "MySQL",
    "MongoDB",
    "Claude",
    "Jenkins",
    "Grafana",
    "i18n (Internationalization)",
    "Performance",
    "Accessibility",
  ],
};
