import { loadPdfJs } from "./pdf-loader.js";
import { createThumbnail } from "./thumbnails.js";
import { createOutlineItem } from "./outline.js";

let pdfDocument = null;
let pdfViewer = null;
let currentPageNumber = 1;
let zoomLevel = 1;
let currentScale = 1;
let pageRendering = false;
let pageNumPending = null;
let totalPages = 0;
let pagesRendered = {};
let pageDimensions = []; // Store page dimensions for pre-allocation

// Container elements
const viewerContainer = document.getElementById("viewer");
const thumbnailsContainer = document.getElementById("thumbnails-container");
const outlineContainer = document.getElementById("outline-container");
const pageCountElement = document.getElementById("page-count");
const currentPageInput = document.getElementById("current-page");
const filenameElement = document.getElementById("filename");

/**
 * Initializes the PDF viewer
 */
export async function initializePdfViewer() {
  const pdfUrl =
    "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";
  loadPdfFromUrl(pdfUrl);

  // Add scroll event listener to update current page
  document
    .getElementById("pdf-viewer")
    .addEventListener("scroll", handleScroll);
}

// Track which page is currently visible during scrolling
let scrollTimeout = null;
function handleScroll(e) {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }

  scrollTimeout = setTimeout(() => {
    updateCurrentPageFromScroll();
    // Also check for pages that need rendering
    checkPagesNeedRendering();
  }, 100);
}

/**
 * Determine which page is currently most visible in the viewport
 */
function updateCurrentPageFromScroll() {
  if (!pdfDocument) return;

  const pdfViewer = document.getElementById("pdf-viewer");
  const pages = document.querySelectorAll(".pdf-page");
  const viewerRect = pdfViewer.getBoundingClientRect();

  let maxVisiblePage = null;
  let maxVisibleArea = 0;

  pages.forEach((page) => {
    const pageRect = page.getBoundingClientRect();
    // Calculate intersection area between page and viewer
    const pageNum = parseInt(page.id.replace("page-", ""));

    // Check if page is in the viewport
    const verticalOverlap = Math.max(
      0,
      Math.min(pageRect.bottom, viewerRect.bottom) -
        Math.max(pageRect.top, viewerRect.top)
    );

    const horizontalOverlap = Math.max(
      0,
      Math.min(pageRect.right, viewerRect.right) -
        Math.max(pageRect.left, viewerRect.left)
    );

    const visibleArea = verticalOverlap * horizontalOverlap;

    if (visibleArea > maxVisibleArea) {
      maxVisibleArea = visibleArea;
      maxVisiblePage = pageNum;
    }
  });

  if (maxVisiblePage && maxVisiblePage !== currentPageNumber) {
    currentPageNumber = maxVisiblePage;
    currentPageInput.value = maxVisiblePage;

    // Update thumbnail highlighting
    highlightThumbnail(currentPageNumber);
  }
}

/**
 * Check which pages are visible or about to become visible and render them
 */
function checkPagesNeedRendering() {
  if (!pdfDocument) return;

  const pdfViewer = document.getElementById("pdf-viewer");
  const viewerRect = pdfViewer.getBoundingClientRect();
  const pageContainers = document.querySelectorAll(".pdf-page-container");

  // Get viewport boundaries with buffer for preloading
  const viewportTop = pdfViewer.scrollTop - viewerRect.height * 1.5; // Buffer above
  const viewportBottom = pdfViewer.scrollTop + viewerRect.height * 2.5; // Buffer below

  pageContainers.forEach((container) => {
    const canvas = container.querySelector("canvas");
    if (!canvas) return;

    const pageNum = parseInt(canvas.dataset.pageNumber, 10);
    const containerTop = container.offsetTop;
    const containerBottom = containerTop + container.offsetHeight;

    // Check if this page is within our extended viewport
    if (containerBottom >= viewportTop && containerTop <= viewportBottom) {
      if (!pagesRendered[pageNum]) {
        // This page is or will soon be visible but isn't rendered yet
        renderPage(pageNum, false); // Don't scroll when rendering visible pages
      }
    }
  });
}

/**
 * Highlight the current page's thumbnail
 * @param {number} pageNum Page number to highlight
 */
function highlightThumbnail(pageNum) {
  const thumbnails = document.querySelectorAll(".thumbnail");
  thumbnails.forEach((thumbnail) => {
    thumbnail.classList.remove("active");
    if (parseInt(thumbnail.dataset.pageNumber) === pageNum) {
      thumbnail.classList.add("active");
    }
  });
}

/**
 * Loads a PDF from a URL
 * @param {string} url URL of the PDF to load
 */
export async function loadPdfFromUrl(url) {
  try {
    const pdfjsLib = await loadPdfJs();

    // Display loading state
    viewerContainer.innerHTML = '<div class="loading">Loading PDF...</div>';

    const loadingTask = pdfjsLib.getDocument(url);

    pdfDocument = await loadingTask.promise;
    totalPages = pdfDocument.numPages;

    // Update UI with document info
    pageCountElement.textContent = totalPages;
    currentPageInput.max = totalPages;
    currentPageInput.value = 1;

    // Set document title
    const metadata = await pdfDocument.getMetadata();
    filenameElement.textContent = url.split("/").pop() || "Document.pdf";

    // Clear the viewer container
    viewerContainer.innerHTML = "";
    pagesRendered = {};
    pageDimensions = [];

    // Get dimensions for all pages
    await getPageDimensions();

    // Render all pages with proper space allocation
    await renderAllPages();

    // Generate thumbnails
    generateThumbnails();

    // Load document outline if available
    loadDocumentOutline();

    return true;
  } catch (error) {
    console.error("Error loading PDF:", error);
    viewerContainer.innerHTML = `<div class="error">Failed to load PDF: ${error.message}</div>`;
    return false;
  }
}

/**
 * Get dimensions for all pages to pre-allocate space
 */
async function getPageDimensions() {
  pageDimensions = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: currentScale });
    pageDimensions.push({
      width: viewport.width,
      height: viewport.height,
    });
  }
}

/**
 * Loads PDF from ArrayBuffer data
 * @param {ArrayBuffer} data The PDF data
 * @param {string} filename The name of the file
 */
export async function loadPdfFromData(data, filename) {
  try {
    const pdfjsLib = await loadPdfJs();

    // Display loading state
    viewerContainer.innerHTML = '<div class="loading">Loading PDF...</div>';

    const loadingTask = pdfjsLib.getDocument({ data });

    pdfDocument = await loadingTask.promise;
    totalPages = pdfDocument.numPages;

    // Update UI with document info
    pageCountElement.textContent = totalPages;
    currentPageInput.max = totalPages;
    currentPageInput.value = 1;
    filenameElement.textContent = filename || "Document.pdf";

    // Clear the viewer container
    viewerContainer.innerHTML = "";
    pagesRendered = {};
    pageDimensions = [];

    // Get dimensions for all pages
    await getPageDimensions();

    // Render all pages with proper space allocation
    await renderAllPages();

    // Generate thumbnails
    generateThumbnails();

    // Load document outline if available
    loadDocumentOutline();

    return true;
  } catch (error) {
    console.error("Error loading PDF:", error);
    viewerContainer.innerHTML = `<div class="error">Failed to load PDF: ${error.message}</div>`;
    return false;
  }
}

/**
 * Renders all pages of the PDF with pre-allocated space
 */
async function renderAllPages() {
  if (!pdfDocument) return;

  const fragment = document.createDocumentFragment();

  for (let i = 1; i <= totalPages; i++) {
    // Create a container for each page with pre-allocated dimensions
    const pageContainer = document.createElement("div");
    pageContainer.className = "pdf-page-container";

    // Set the height based on pre-calculated dimensions to prevent layout shifts
    if (pageDimensions[i - 1]) {
      pageContainer.style.height = `${pageDimensions[i - 1].height}px`;
      pageContainer.style.width = `${pageDimensions[i - 1].width}px`;
    }

    pageContainer.innerHTML = '<div class="loading"></div>';

    const canvas = document.createElement("canvas");
    canvas.id = `page-${i}`;
    canvas.className = "pdf-page";
    canvas.dataset.pageNumber = i;

    // Placeholder for sizing
    if (pageDimensions[i - 1]) {
      canvas.style.width = `${pageDimensions[i - 1].width}px`;
      canvas.style.height = `${pageDimensions[i - 1].height}px`;
    }

    pageContainer.appendChild(canvas);
    fragment.appendChild(pageContainer);
  }

  // Append all page containers to the viewer
  viewerContainer.appendChild(fragment);

  // Start rendering page 1 and nearby pages
  renderPage(currentPageNumber, false).then(() => {
    renderNearbyPages(currentPageNumber);

    // Initialize the check for visible pages
    setTimeout(() => {
      checkPagesNeedRendering();
    }, 200);
  });
}

/**
 * Renders a specific page of the PDF
 * @param {number} pageNum Page number to render
 * @param {boolean} scrollToIt Whether to scroll to the page after rendering (default: true)
 */
export async function renderPage(pageNum, scrollToIt = true) {
  if (pageRendering && pageNumPending !== pageNum) {
    pageNumPending = pageNum;
    return;
  }

  if (!pdfDocument) return;

  pageRendering = true;
  currentPageNumber = pageNum;

  try {
    const page = await pdfDocument.getPage(pageNum);

    // Get canvas for this page
    const canvas = document.getElementById(`page-${pageNum}`);
    if (!canvas) {
      console.error(`Canvas for page ${pageNum} not found`);
      pageRendering = false;
      return;
    }

    // Store current scroll position
    const pdfViewer = document.getElementById("pdf-viewer");
    const currentScroll = pdfViewer.scrollTop;

    const viewport = page.getViewport({ scale: currentScale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Prepare canvas for rendering
    const renderContext = {
      canvasContext: canvas.getContext("2d"),
      viewport: viewport,
    };

    // Render the page
    const renderTask = page.render(renderContext);
    await renderTask.promise;

    // Remove loading indicator from the parent container
    const container = canvas.parentElement;
    const loadingIndicator = container.querySelector(".loading");
    if (loadingIndicator) {
      container.removeChild(loadingIndicator);
    }

    // Mark the page as rendered
    pagesRendered[pageNum] = true;

    // Update UI
    currentPageInput.value = pageNum;
    highlightThumbnail(pageNum);

    // Restore scroll position to prevent jumps unless explicitly asked to scroll
    if (!scrollToIt) {
      pdfViewer.scrollTop = currentScroll;
    } else {
      scrollToPage(pageNum);
    }

    // Check if there's another page request pending
    pageRendering = false;
    if (pageNumPending !== null && pageNumPending !== pageNum) {
      renderPage(pageNumPending, scrollToIt);
      pageNumPending = null;
    }
  } catch (error) {
    console.error("Error rendering page:", error);
    pageRendering = false;
  }
}

/**
 * Renders pages that are adjacent to the current page
 * @param {number} currentPageNum The current page number
 */
function renderNearbyPages(currentPageNum) {
  // Store current scroll position before rendering nearby pages
  const pdfViewer = document.getElementById("pdf-viewer");
  const currentScroll = pdfViewer.scrollTop;

  // Render 2 pages ahead and 1 page behind for smoother experience
  const pagesToRender = [
    currentPageNum - 1,
    currentPageNum + 1,
    currentPageNum + 2,
  ];

  pagesToRender.forEach((pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages && !pagesRendered[pageNum]) {
      // Use setTimeout to not block the UI
      setTimeout(() => {
        renderPage(pageNum, false); // Don't scroll when rendering nearby pages
      }, 100);
    }
  });

  // Restore scroll position after scheduling the renders
  setTimeout(() => {
    pdfViewer.scrollTop = currentScroll;
  }, 0);
}

/**
 * Scrolls to a specific page
 * @param {number} pageNum The page to scroll to
 */
function scrollToPage(pageNum) {
  const pageElement = document.getElementById(`page-${pageNum}`);
  if (pageElement) {
    pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/**
 * Changes page to the previous one
 */
export function prevPage() {
  if (currentPageNumber <= 1) return;
  renderPage(currentPageNumber - 1);
}

/**
 * Changes page to the next one
 */
export function nextPage() {
  if (currentPageNumber >= totalPages) return;
  renderPage(currentPageNumber + 1);
}

/**
 * Go to a specific page
 * @param {number} pageNum The page number to go to
 */
export function goToPage(pageNum) {
  if (pageNum < 1 || pageNum > totalPages) return;
  renderPage(pageNum);
}

/**
 * Sets the zoom level
 * @param {number|string} scale The zoom scale or 'auto' for fit page
 */
export function setZoom(scale) {
  if (!pdfDocument) return;

  // Store current page to maintain position
  const previousPage = currentPageNumber;

  // Store current scroll position and visible page
  const pdfViewer = document.getElementById("pdf-viewer");
  const scrollTopPercentage = pdfViewer.scrollTop / pdfViewer.scrollHeight;

  if (scale === "auto") {
    // Fit to page calculation
    const pdfContainer = document.getElementById("pdf-viewer");
    const containerWidth = pdfContainer.clientWidth - 40; // Account for padding

    pdfDocument.getPage(currentPageNumber).then((page) => {
      const viewport = page.getViewport({ scale: 1.0 });
      const scaleFactor = containerWidth / viewport.width;

      // Update zoom level
      currentScale = scaleFactor;
      zoomLevel = "auto";

      // Clear and re-render pages with new dimensions
      updatePageDimensionsAndRender(previousPage, scrollTopPercentage);
    });
  } else {
    // Update zoom level
    currentScale = parseFloat(scale);
    zoomLevel = currentScale;

    // Clear and re-render pages with new dimensions
    updatePageDimensionsAndRender(previousPage, scrollTopPercentage);
  }
}

/**
 * Updates page dimensions and re-renders with the new scale
 * @param {number} pageToFocus Page number to focus after re-rendering
 * @param {number} scrollPercentage Percentage of scroll position to maintain
 */
async function updatePageDimensionsAndRender(pageToFocus, scrollPercentage) {
  // Get new dimensions for all pages with the new scale
  await getPageDimensions();

  // Clear the viewer container
  viewerContainer.innerHTML = "";

  // Clear the rendered pages tracking
  pagesRendered = {};

  // Set up pages with new scale and pre-allocated space
  const fragment = document.createDocumentFragment();
  for (let i = 1; i <= totalPages; i++) {
    const pageContainer = document.createElement("div");
    pageContainer.className = "pdf-page-container";

    // Pre-allocate space based on new dimensions
    if (pageDimensions[i - 1]) {
      pageContainer.style.height = `${pageDimensions[i - 1].height}px`;
      pageContainer.style.width = `${pageDimensions[i - 1].width}px`;
    }

    pageContainer.innerHTML = '<div class="loading"></div>';

    const canvas = document.createElement("canvas");
    canvas.id = `page-${i}`;
    canvas.className = "pdf-page";
    canvas.dataset.pageNumber = i;

    // Add placeholder dimensions
    if (pageDimensions[i - 1]) {
      canvas.style.width = `${pageDimensions[i - 1].width}px`;
      canvas.style.height = `${pageDimensions[i - 1].height}px`;
    }

    pageContainer.appendChild(canvas);
    fragment.appendChild(pageContainer);
  }

  // Append all page containers to the viewer
  viewerContainer.appendChild(fragment);

  // Set scroll position based on percentage before rendering
  const pdfViewer = document.getElementById("pdf-viewer");
  setTimeout(() => {
    pdfViewer.scrollTop = pdfViewer.scrollHeight * scrollPercentage;
  }, 0);

  // Render the focus page first
  renderPage(pageToFocus, false).then(() => {
    // Then render nearby pages without scrolling
    renderNearbyPages(pageToFocus);
  });
}

/**
 * Generates thumbnails for all pages
 */
async function generateThumbnails() {
  if (!pdfDocument) return;

  // Clear thumbnails container
  thumbnailsContainer.innerHTML = "";

  // Generate a thumbnail for each page
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDocument.getPage(i);
    const thumbnail = await createThumbnail(page, i);

    // Add click event listener to thumbnail
    thumbnail.addEventListener("click", () => {
      renderPage(i);
    });

    thumbnailsContainer.appendChild(thumbnail);
  }
}

/**
 * Loads the document outline (bookmarks)
 */
async function loadDocumentOutline() {
  if (!pdfDocument) return;

  // Clear outline container
  outlineContainer.innerHTML = "";

  try {
    const outline = await pdfDocument.getOutline();

    if (outline && outline.length > 0) {
      const outlineList = document.createElement("ul");
      outlineList.className = "outline-list";

      for (const item of outline) {
        const outlineItem = createOutlineItem(item, pdfDocument);
        outlineItem.addEventListener("click", async (e) => {
          e.preventDefault();

          if (item.dest) {
            let destRef;
            if (typeof item.dest === "string") {
              destRef = await pdfDocument.getDestination(item.dest);
            } else {
              destRef = item.dest;
            }

            if (Array.isArray(destRef) && destRef.length > 0) {
              const ref = destRef[0];
              const pageIndex = await pdfDocument.getPageIndex(ref);
              renderPage(pageIndex + 1);
            }
          } else if (item.url) {
            window.open(item.url, "_blank");
          }
        });

        outlineList.appendChild(outlineItem);
      }

      outlineContainer.appendChild(outlineList);
    } else {
      outlineContainer.innerHTML =
        '<p class="empty-outline">No outline available</p>';
    }
  } catch (error) {
    console.error("Error loading outline:", error);
    outlineContainer.innerHTML =
      '<p class="empty-outline">Error loading outline</p>';
  }
}

/**
 * Performs a text search in the PDF
 * @param {string} query The search query
 */
export async function searchInDocument(query) {
  if (!pdfDocument || !query) return { count: 0, results: [] };

  const results = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => item.str).join(" ");

    // Simple search implementation
    if (text.toLowerCase().includes(query.toLowerCase())) {
      results.push({ pageNumber: i, text });
    }
  }

  return { count: results.length, results };
}

export { currentPageNumber, totalPages };
