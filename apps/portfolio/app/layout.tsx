/**
 * Root layout of the portfolio: the page title and description, the shared colour tokens and the
 * global styles.
 */

import type { Metadata } from "next";
import "@repo/ui/tokens.css";
import "./globals.css";
import { profile } from "../content";

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role}`,
  description: profile.tagline,
};

/** Wraps every page in the html and body elements. */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
