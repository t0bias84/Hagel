import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Importera hela Tailwind/CSS en gång
import "./index.css";

// Import av den huvudsakliga App-komponenten
import App from "./App";

// Import av i18n-konfigurationen
import "./i18n.js";

/**
 * Huvudmetod för att rendera applikationen i #root.
 * Använder React 18:s createRoot (från react-dom/client).
 */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
