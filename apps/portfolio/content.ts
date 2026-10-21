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
    "Claude",
    "Jenkins",
    "Grafana",
    "i18n (Internationalization)",
    "Performance",
    "Accessibility",
  ],
};
