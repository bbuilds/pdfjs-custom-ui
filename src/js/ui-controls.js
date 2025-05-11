import {
  prevPage,
  nextPage,
  goToPage,
  setZoom,
  searchInDocument,
  currentPageNumber,
  totalPages,
} from "./pdf-viewer.js";
import { trackInteraction, trackSearch } from "./ga-events.js";

let isSearchOpen = false;
let isSidebarOpen = true;
let currentSearchResults = [];
let currentSearchIndex = -1;

/**
 * Sets up UI controls for the PDF viewer
 */
export function setupUIControls() {
  setupNavigationControls();
  setupZoomControls();
  setupSidebarControls();
  setupSearchControls();
  setupFullscreenControl();
  setupKeyboardShortcuts();

  // Initially update UI state
  updateUIState();

  // Add window resize listener for responsive behavior
  window.addEventListener("resize", handleWindowResize);
}

/**
 * Sets up page navigation controls
 */
function setupNavigationControls() {
  const prevPageButton = document.getElementById("prev-page");
  const nextPageButton = document.getElementById("next-page");
  const currentPageInput = document.getElementById("current-page");

  prevPageButton.addEventListener("click", () => {
    prevPage();
    updateUIState();
  });

  nextPageButton.addEventListener("click", () => {
    nextPage();
    updateUIState();
  });

  currentPageInput.addEventListener("change", () => {
    const pageNumber = parseInt(currentPageInput.value, 10);
    if (pageNumber && pageNumber > 0 && pageNumber <= totalPages) {
      goToPage(pageNumber);
    } else {
      currentPageInput.value = currentPageNumber;
    }
    updateUIState();
  });
}

/**
 * Sets up zoom controls
 */
function setupZoomControls() {
  const zoomInButton = document.getElementById("zoom-in");
  const zoomOutButton = document.getElementById("zoom-out");
  const zoomSelect = document.getElementById("zoom-level");

  zoomInButton.addEventListener("click", () => {
    const currentValue = zoomSelect.value;

    if (currentValue === "auto") {
      zoomSelect.value = "1";
      setZoom(1);
    } else {
      const nextIndex = Math.min(
        zoomSelect.options.length - 2,
        zoomSelect.selectedIndex + 1
      );
      zoomSelect.selectedIndex = nextIndex;
      setZoom(zoomSelect.value);
    }
  });

  zoomOutButton.addEventListener("click", () => {
    const currentValue = zoomSelect.value;

    if (currentValue === "auto") {
      zoomSelect.value = "1";
      setZoom(1);
    } else {
      const nextIndex = Math.max(0, zoomSelect.selectedIndex - 1);
      zoomSelect.selectedIndex = nextIndex;
      setZoom(zoomSelect.value);
    }
  });

  zoomSelect.addEventListener("change", () => {
    setZoom(zoomSelect.value);
  });
}

/**
 * Sets up sidebar controls
 */
function setupSidebarControls() {
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const thumbnailsTab = document.getElementById("thumbnails-tab");
  const outlineTab = document.getElementById("outline-tab");
  const thumbnailsPanel = document.getElementById("thumbnails-panel");
  const outlinePanel = document.getElementById("outline-panel");

  sidebarToggle.addEventListener("click", () => {
    isSidebarOpen = !isSidebarOpen;
    sidebar.classList.toggle("closed", !isSidebarOpen);
    sidebarToggle.setAttribute("aria-expanded", isSidebarOpen.toString());
    document
      .querySelector(".pdf-viewer")
      .classList.toggle("sidebar-closed", !isSidebarOpen);

    // Track sidebar toggle
    trackInteraction("sidebar", {
      action: isSidebarOpen ? "open" : "close",
    });
  });

  thumbnailsTab.addEventListener("click", () => {
    thumbnailsTab.classList.add("active");
    outlineTab.classList.remove("active");
    thumbnailsPanel.classList.add("active");
    outlinePanel.classList.remove("active");

    // Track sidebar tab change
    trackInteraction("sidebar_tab", {
      tab: "thumbnails",
    });
  });

  outlineTab.addEventListener("click", () => {
    outlineTab.classList.add("active");
    thumbnailsTab.classList.remove("active");
    outlinePanel.classList.add("active");
    thumbnailsPanel.classList.remove("active");

    // Track sidebar tab change
    trackInteraction("sidebar_tab", {
      tab: "outline",
    });
  });

  // On smaller screens, close sidebar by default
  if (window.innerWidth < 768) {
    isSidebarOpen = false;
    sidebar.classList.add("closed");
    document.querySelector(".pdf-viewer").classList.add("sidebar-closed");
  }
}

/**
 * Sets up search controls
 */
function setupSearchControls() {
  const searchToggle = document.getElementById("search-toggle");
  const searchContainer = document.querySelector(".search-container");
  const searchInput = document.getElementById("search-input");
  const searchNextButton = document.getElementById("search-next");
  const searchPrevButton = document.getElementById("search-prev");
  const searchCloseButton = document.getElementById("search-close");
  const searchResultsCount = document.getElementById("search-results-count");

  searchToggle.addEventListener("click", () => {
    isSearchOpen = !isSearchOpen;
    searchContainer.classList.toggle("hidden", !isSearchOpen);

    trackInteraction("search_ui", {
      action: isSearchOpen ? "open" : "close",
    });

    if (isSearchOpen) {
      searchInput.focus();
    }
  });

  searchCloseButton.addEventListener("click", () => {
    isSearchOpen = false;
    searchContainer.classList.add("hidden");
    searchInput.value = "";
    searchResultsCount.textContent = "";
    clearSearchHighlights();

    trackInteraction("search_ui", {
      action: "close",
    });
  });

  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const query = searchInput.value.trim();

      if (query.length < 2) {
        searchResultsCount.textContent = "";
        searchNextButton.disabled = true;
        searchPrevButton.disabled = true;
        clearSearchHighlights();
        return;
      }

      const searchResults = await searchInDocument(query);
      currentSearchResults = searchResults.results;
      currentSearchIndex = -1;

      // Track search results
      trackSearch(query, searchResults.count);

      if (searchResults.count > 0) {
        searchResultsCount.textContent = `${searchResults.count} results found`;
        searchNextButton.disabled = false;
        searchPrevButton.disabled = true;
        navigateSearchResult("next");
      } else {
        searchResultsCount.textContent = "No results found";
        searchNextButton.disabled = true;
        searchPrevButton.disabled = true;
      }
    }, 300);
  });

  searchNextButton.addEventListener("click", () => {
    navigateSearchResult("next");
  });

  searchPrevButton.addEventListener("click", () => {
    navigateSearchResult("prev");
  });
}

/**
 * Navigates to the next or previous search result
 * @param {string} direction 'next' or 'prev'
 */
function navigateSearchResult(direction) {
  if (currentSearchResults.length === 0) return;

  const oldIndex = currentSearchIndex;

  if (direction === "next") {
    currentSearchIndex = (currentSearchIndex + 1) % currentSearchResults.length;
  } else {
    currentSearchIndex =
      (currentSearchIndex - 1 + currentSearchResults.length) %
      currentSearchResults.length;
  }

  const result = currentSearchResults[currentSearchIndex];
  goToPage(result.pageNumber);

  // Track search result navigation
  trackInteraction("search_navigation", {
    direction: direction,
    result_index: currentSearchIndex,
    total_results: currentSearchResults.length,
    page_navigated_to: result.pageNumber,
    from_index: oldIndex,
  });

  document.getElementById("search-prev").disabled = false;
  document.getElementById("search-next").disabled = false;
}

/**
 * Clears search highlights from the document
 */
function clearSearchHighlights() {
  // In a real implementation, this would remove highlight elements
  // For our basic implementation, this is a placeholder
}

/**
 * Sets up fullscreen control
 */
function setupFullscreenControl() {
  const fullscreenButton = document.getElementById("fullscreen");
  const viewerElement = document.querySelector(".pdf-viewer");

  fullscreenButton.addEventListener("click", () => {
    const isEnteringFullscreen = !document.fullscreenElement;

    if (isEnteringFullscreen) {
      viewerElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }

    trackInteraction("fullscreen", {
      action: isEnteringFullscreen ? "enter" : "exit",
    });
  });

  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) {
      fullscreenButton.setAttribute("aria-label", "Exit fullscreen");
      fullscreenButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 16H8V19H10V14H5V16ZM8 8H5V10H10V5H8V8ZM14 19H16V16H19V14H14V19ZM16 8V5H14V10H19V8H16Z" fill="currentColor"/>
        </svg>
      `;
    } else {
      fullscreenButton.setAttribute("aria-label", "Fullscreen");
      fullscreenButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 14H5V19H10V17H7V14ZM5 10H7V7H10V5H5V10ZM17 17H14V19H19V14H17V17ZM14 5V7H17V10H19V5H14Z" fill="currentColor"/>
        </svg>
      `;
    }
  });
}

/**
 * Sets up keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Only process shortcuts if we're not in an input
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      return;
    }

    switch (e.key) {
      case "ArrowLeft":
        prevPage();
        updateUIState();
        break;
      case "ArrowRight":
        nextPage();
        updateUIState();
        break;
      case "+":
        document.getElementById("zoom-in").click();
        break;
      case "-":
        document.getElementById("zoom-out").click();
        break;
      case "f":
        if (!e.ctrlKey && !e.metaKey) {
          document.getElementById("fullscreen").click();
        }
        break;
      case "/":
      case "f3":
        document.getElementById("search-toggle").click();
        e.preventDefault();
        break;
      case "Escape":
        if (isSearchOpen) {
          document.getElementById("search-close").click();
        } else if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        break;
    }
  });
}

/**
 * Handles window resize events
 */
function handleWindowResize() {
  // Adjust sidebar visibility based on screen size
  if (window.innerWidth < 768 && isSidebarOpen) {
    isSidebarOpen = false;
    document.getElementById("sidebar").classList.add("closed");
    document.querySelector(".pdf-viewer").classList.add("sidebar-closed");
  }

  // Adjust zoom if it's set to auto (fit to window)
  const zoomSelect = document.getElementById("zoom-level");
  if (zoomSelect.value === "auto") {
    setZoom("auto");
  }
}

/**
 * Updates UI state based on current viewer state
 */
function updateUIState() {
  const prevPageButton = document.getElementById("prev-page");
  const nextPageButton = document.getElementById("next-page");

  prevPageButton.disabled = currentPageNumber <= 1;
  nextPageButton.disabled = currentPageNumber >= totalPages;
}
