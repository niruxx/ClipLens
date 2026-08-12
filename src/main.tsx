import { getCurrentWindow } from "@tauri-apps/api/window";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import QuickPanel from "./QuickPanel";
import "./index.css";

const isQuickWindow = getCurrentWindow().label === "quick";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isQuickWindow ? <QuickPanel /> : <App />}</React.StrictMode>,
);
