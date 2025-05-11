import "./styles/main.css";
import "./styles/sidebar.css";
import "./styles/toolbar.css";
import "./styles/pdf-viewer.css";
import "./styles/search.css";
import "./styles/animations.css";
import { initializePdfViewer } from "./js/pdf-viewer.js";
import { setupUIControls } from "./js/ui-controls.js";

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializePdfViewer();
  setupUIControls();
});
