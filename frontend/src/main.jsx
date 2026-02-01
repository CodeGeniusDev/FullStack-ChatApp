import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { setupGlobalErrorHandlers } from "./lib/errorHandlers";

// Setup global error handlers FIRST
setupGlobalErrorHandlers();

// Debug logging to track render cycles
console.log("🚀 main.jsx: Initializing app");

// Add global error handler to catch any reload triggers
window.addEventListener('error', (event) => {
  console.error("🔴 Global error caught:", event.error);
});

// Log any programmatic navigation attempts
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  console.log("📍 history.pushState called:", args);
  return originalPushState.apply(this, args);
};

history.replaceState = function(...args) {
  console.log("📍 history.replaceState called:", args);
  return originalReplaceState.apply(this, args);
};

// Detect any location changes
window.addEventListener('hashchange', () => {
  console.log("🔄 Hash changed:", window.location.hash);
});

window.addEventListener('popstate', () => {
  console.log("🔄 Popstate event:", window.location.href);
});

// StrictMode can cause double-renders in dev, but shouldn't cause infinite loops
// Keeping it enabled for now, but this is a potential culprit
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

console.log("✅ main.jsx: App mounted");
