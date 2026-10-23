import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";
import { ensureSeed } from "./data/db";
import { captureAuthFromUrl } from "./data/strava";

registerSW({ immediate: true });

async function start() {
  await ensureSeed();
  await captureAuthFromUrl();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
start();
