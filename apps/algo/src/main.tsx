import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "@repo/ui/tokens.css";
import "./styles.css";
import { Index, Visualizer } from "./Lab";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

// Restore the deep link saved by the root 404.html (static hosts have no SPA fallback)
try {
  const saved = sessionStorage.getItem("spa-redirect");
  if (saved) {
    sessionStorage.removeItem("spa-redirect");
    history.replaceState(null, "", saved);
  }
} catch {}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/:id" element={<Visualizer />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
