// Edit this file: it is the only place with personal details.
export const base = process.env.NEXT_PUBLIC_BASE ?? "";

export const profile = {
    name: "Akshay Gajbhiya",
    role: "Full-Stack, Frontend-Heavy",
    designation: "Staff Software Engineer",
    tagline:
        "Staff Software Engineer with twelve years across front end, full stack and applied AI. I lead platforms that teams ship independently, set the standards that hold as organisations grow, and mentor the engineers who build on them.",
    github: "https://github.com/kingaki007",
    email: "akshay.gajbhiya79@gmail.com",
    // Put the PDF at apps/portfolio/public/Akshay_Gajbhiya_Resume.pdf
    resume: `${base}/Akshay_Gajbhiya_Resume.pdf`,
    summarySub:
        "I started as full-stack, grew interest towards front end, and now put AI to work in the products I build and in how I build them.",
    metrics: [
        { value: "12+", label: "years in industry, 2014 to today" },
        { value: "2+", label: "years of freelance work, 2012–2014" },
        { value: "7+", label: "teams on one micro-frontend platform" },
        { value: "300%", label: "more production deploys per month" },
        { value: "55%", label: "faster LCP on product pages" },
        {
            value: "50%",
            label: "less duplicated code through shared components",
        },
        {
            value: "30+",
            label: "engineers working to the frontend standards I set up",
        },
        { value: "5", label: "engineers mentored to own complex UI work" },
    ],
    stages: [
        {
            tag: "01",
            title: "Frontend",
            blurb: "Where it began, and where my leadership shows. Architecting UI platforms in React, Angular and TypeScript, with an obsession for performance, accessibility and shared systems that teams actually adopt.",
            points: [
                "Micro-frontends and monorepos",
                "Core Web Vitals and virtualization",
                "Shared libraries, standards and mentoring",
            ],
        },
        {
            tag: "02",
            title: "Full-stack",
            blurb: "Owning the whole path from browser to database. APIs, real-time systems and pipelines, so features ship end to end without hand-offs.",
            points: [
                "Node.js, Java (Spring Boot), Python (FastAPI)",
                "WebSockets and GraphQL",
                "MySQL and MongoDB data layers",
                "Jenkins, Grafana and observability",
            ],
        },
        {
            tag: "03",
            title: "AI-enabled engineer",
            blurb: "Using LLMs as a force multiplier: integrating AI into products with tool calling and MCP, and working with coding agents to move faster without lowering the bar.",
            points: [
                "LLM and MCP integration",
                "RAG and Agentic AI",
                "Tool calling and AI-assisted coding",
                "Claude in the daily workflow",
            ],
        },
    ],
    projects: [
        {
            title: "Algo Lab",
            blurb: "Step-by-step visual data structures and algorithms with synced code.",
            href: `${base}/algo/`,
        },
        {
            title: "CSS & Motion Lab",
            blurb: "Scroll-driven animation, @property gradients, 3D tilt, view transitions, container queries and a particle network. Plain CSS and a few lines of JS.",
            href: `${base}/animations/`,
            tags: [
                "CSS",
                "@property",
                "View Transitions",
                "Canvas",
                "Container Queries",
            ],
        },
        {
            title: "PDFPark",
            blurb: "An all-in-one stop for everything PDF: edit text, merge, reorder, sign, convert to Word, Excel and PowerPoint, unlock and OCR. No registration, no analytics or ad trackers, and editing runs entirely in your browser.",
            href: "https://pdfpark.in",
            tags: [
                "React 19",
                "TypeScript",
                "PDF.js",
                "pdf-lib",
                "Web Workers",
                "FastAPI",
                "PostgreSQL",
                "Docker",
            ],
        },
        {
            title: "Full-stack project",
            blurb: "Coming soon. More full-stack projects will be added here.",
            href: "#",
        },
    ],
    skills: [
        "TypeScript",
        "React",
        "Next.js",
        "Angular",
        "HTML",
        "CSS / Animation",
        "Node.js",
        "TanStack",
        "JQuery",
        "WebSockets",
        "Java (Spring Boot)",
        "Python (FastAPI)",
        "PHP (CodeIgniter)",
        "MySQL",
        "PostgresSQL",
        "MongoDB",
        "Claude",
        "RAG",
        "Agentic AI",
        "Jenkins",
        "Grafana",
        "i18n (Internationalization)",
        "Performance",
        "Accessibility",
    ],
};
