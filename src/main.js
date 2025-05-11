import "./styles/main.css";
import "./styles/sidebar.css";
import "./styles/toolbar.css";
import "./styles/pdf-viewer.css";
import "./styles/search.css";
import "./styles/animations.css";
import { initializePdfViewer } from "./js/pdf-viewer.js";
import { setupUIControls } from "./js/ui-controls.js";
import { trackSessionEnd } from "./js/ga-events.js";

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  // Set up visibility change detection for analytics
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      trackSessionEnd("tab_hidden");
    }
  });

  // Track if user closes/navigates away
  window.addEventListener("beforeunload", () => {
    trackSessionEnd("page_close");
  });

  // Initialize the app
  initializePdfViewer();
  setupUIControls();
});
