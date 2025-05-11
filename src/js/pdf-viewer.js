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
  const pdfjsLib = await loadPdfJs();

  // Initially show sample PDF or open dialog
  const pdfUrl =
    "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";
  loadPdfFromUrl(pdfUrl);
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

    // Render first page
    renderPage(1);

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

    // Render first page
    renderPage(1);

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
 * Renders a specific page of the PDF
 * @param {number} pageNum Page number to render
 */
export async function renderPage(pageNum) {
  if (pageRendering) {
    pageNumPending = pageNum;
    return;
  }

  if (!pdfDocument) return;

  pageRendering = true;
  currentPageNumber = pageNum;

  try {
    const page = await pdfDocument.getPage(pageNum);

    // Create canvas for this page if it doesn't exist
    let canvas = document.getElementById(`page-${pageNum}`);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = `page-${pageNum}`;
      canvas.className = "pdf-page";
      viewerContainer.appendChild(canvas);
    }

    const viewport = page.getViewport({ scale: currentScale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Prepare canvas for rendering
    const renderContext = {
      canvasContext: canvas.getContext("2d"),
      viewport: viewport,
    };

    // Hide all pages and show only current one
    document.querySelectorAll(".pdf-page").forEach((page) => {
      page.style.display = "none";
    });
    canvas.style.display = "block";

    // Render the page
    const renderTask = page.render(renderContext);
    await renderTask.promise;

    // Update UI
    currentPageInput.value = pageNum;

    // Check if there's another page request pending
    pageRendering = false;
    if (pageNumPending !== null) {
      renderPage(pageNumPending);
      pageNumPending = null;
    }
  } catch (error) {
    console.error("Error rendering page:", error);
    pageRendering = false;
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
  if (scale === "auto") {
    // Fit to page calculation
    const pdfContainer = document.getElementById("pdf-viewer");
    const containerWidth = pdfContainer.clientWidth - 40; // Account for padding

    if (pdfDocument) {
      pdfDocument.getPage(currentPageNumber).then((page) => {
        const viewport = page.getViewport({ scale: 1.0 });
        const scaleFactor = containerWidth / viewport.width;
        currentScale = scaleFactor;
        renderPage(currentPageNumber);
      });
    }
  } else {
    currentScale = parseFloat(scale);
    renderPage(currentPageNumber);
  }
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
