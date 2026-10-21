/**
 * The sticky site header: your name on the left and links to the page sections on the right,
 * highlighting the section currently in view.
 */

"use client";

import { useEffect, useState } from "react";

const LINKS = [
    { id: "intro", label: "Intro" },
    { id: "work", label: "Selected work" },
    { id: "skills", label: "Skills" },
    { id: "resume", label: "Resume" },
    { id: "contact", label: "Contact" },
] as const;

/**
 * The header bar; becomes translucent once the page scrolls and highlights the link of the section
 * being read.
 */
export function Header({ name }: { name: string }) {
    const [active, setActive] = useState<string>("");
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        let frame = 0;
        /**
         * Recomputes the header state: whether the page has scrolled, and which section is current
         * (the footer counts when the bottom of the page is reached).
         */
        const update = () => {
            frame = 0;
            setScrolled(window.scrollY > 24);

            // the last section whose top has passed 45% of the viewport is the current one
            const line = window.innerHeight * 0.45;
            let current = "";
            for (const l of LINKS) {
                const el = document.getElementById(l.id);
                if (el && el.getBoundingClientRect().top <= line) current = l.id;
            }
            // the footer can never reach the middle of the screen, so use the page bottom instead
            const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
            setActive(atBottom ? "contact" : current);
        };
        /** Scroll and resize handler: schedules at most one update per animation frame. */
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <header className={scrolled ? "site-header scrolled" : "site-header"}>
            <a href="#top" className="brand" aria-label={`${name}, back to top`}>
                {name}
            </a>
            <nav aria-label="Sections">
                <ul>
                    {LINKS.map((l) => (
                        <li key={l.id}>
                            <a
                                href={`#${l.id}`}
                                aria-current={active === l.id ? "true" : undefined}
                                className={active === l.id ? "on" : undefined}
                            >
                                {l.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </header>
    );
}
