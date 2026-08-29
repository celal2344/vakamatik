import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App.js";
import "./styles.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Vakamatik renderer root was not found.");
}

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
