import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "@repo/ui/tokens.css";
import "./styles.css";
import { Index, Visualizer } from "./Lab";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename="/algo">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/:id" element={<Visualizer />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
