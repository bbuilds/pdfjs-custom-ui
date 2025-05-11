/**
 * PDF Viewer Analytics Module
 * Tracks user interactions with PDF documents
 */

// Track if analytics is initialized
let analyticsInitialized = false;
let sessionStartTime = null;
let lastInteractionTime = null;
let pagesViewed = new Set();
let currentDocumentInfo = null;
let hasScrolledManually = false;

/**
 * Initialize analytics for a new document viewing session
 * @param {Object} documentInfo Information about the document being viewed
 */
export function initAnalytics(documentInfo = {}) {
  sessionStartTime = new Date();
  lastInteractionTime = sessionStartTime;
  pagesViewed.clear();
  hasScrolledManually = false;

  currentDocumentInfo = {
    filename: documentInfo.filename || "unknown",
    totalPages: documentInfo.totalPages || 0,
    fileSize: documentInfo.fileSize || 0,
    documentId:
      documentInfo.documentId || generateDocumentId(documentInfo.filename),
  };

  // Track document open event
  trackEvent("pdf_opened", {
    document_name: currentDocumentInfo.filename,
    total_pages: currentDocumentInfo.totalPages,
    file_size: formatFileSize(currentDocumentInfo.fileSize),
  });

  analyticsInitialized = true;
}

/**
 * Track when a page is viewed
 * @param {number} pageNumber The page number viewed
 * @param {string} viewMethod How the page was accessed (navigation, thumbnail, outline, search)
 */
export function trackPageView(pageNumber, viewMethod = "navigation") {
  if (!analyticsInitialized) return;

  // Update interaction time
  const now = new Date();
  const timeSpentOnPreviousPage = lastInteractionTime
    ? Math.round((now - lastInteractionTime) / 1000)
    : 0;
  lastInteractionTime = now;

  // Add to viewed pages set
  pagesViewed.add(pageNumber);

  trackEvent("page_viewed", {
    document_name: currentDocumentInfo.filename,
    page_number: pageNumber,
    total_pages: currentDocumentInfo.totalPages,
    view_method: viewMethod,
    time_spent_previous_page: timeSpentOnPreviousPage,
    pages_viewed_count: pagesViewed.size,
    pages_viewed_percentage: Math.round(
      (pagesViewed.size / currentDocumentInfo.totalPages) * 100
    ),
    is_first_view: pagesViewed.size === 1,
  });
}

/**
 * Track interactions with the PDF viewer
 * @param {string} interactionType The type of interaction
 * @param {Object} interactionDetails Additional details about the interaction
 */
export function trackInteraction(interactionType, interactionDetails = {}) {
  if (!analyticsInitialized) return;

  lastInteractionTime = new Date();

  trackEvent("pdf_interaction", {
    document_name: currentDocumentInfo.filename,
    interaction_type: interactionType,
    ...interactionDetails,
  });

  // Track scrolling behavior specifically
  if (interactionType === "scroll") {
    hasScrolledManually = true;
  }
}

/**
 * Track document level events
 * @param {string} eventType The type of document event
 * @param {Object} eventDetails Additional details about the event
 */
export function trackDocumentEvent(eventType, eventDetails = {}) {
  if (!analyticsInitialized && eventType !== "pdf_opened") return;

  trackEvent(`document_${eventType}`, {
    document_name: currentDocumentInfo?.filename,
    ...eventDetails,
  });
}

/**
 * Tracks when the user leaves/closes the document
 * Call this on beforeunload event or when switching documents
 */
export function trackSessionEnd(reason = "page_close") {
  if (!analyticsInitialized) return;

  const sessionDuration = Math.round((new Date() - sessionStartTime) / 1000);

  trackEvent("pdf_closed", {
    document_name: currentDocumentInfo.filename,
    total_pages: currentDocumentInfo.totalPages,
    pages_viewed: Array.from(pagesViewed),
    pages_viewed_count: pagesViewed.size,
    pages_viewed_percentage: Math.round(
      (pagesViewed.size / currentDocumentInfo.totalPages) * 100
    ),
    session_duration_seconds: sessionDuration,
    user_scrolled: hasScrolledManually,
    close_reason: reason,
  });

  analyticsInitialized = false;
}

/**
 * Track search events within the PDF
 * @param {string} query The search query
 * @param {number} resultCount Number of results found
 */
export function trackSearch(query, resultCount) {
  if (!analyticsInitialized) return;

  trackEvent("pdf_search", {
    document_name: currentDocumentInfo.filename,
    query: query,
    results_count: resultCount,
    has_results: resultCount > 0,
  });
}

/**
 * Send event to data layer for analytics
 * @param {string} eventName The name of the event
 * @param {Object} eventParams Event parameters
 */
function trackEvent(eventName, eventParams = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...eventParams,
    timestamp: new Date().toISOString(),
  });

  // For debugging in development
  if (process.env.NODE_ENV !== "production") {
    console.log(`Analytics Event: ${eventName}`, eventParams);
  }
}

/**
 * Generate a document ID from filename
 * @param {string} filename The document filename
 * @returns {string} A consistent ID for the document
 */
function generateDocumentId(filename) {
  if (!filename) return "unknown-doc";
  return `doc-${filename.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
}

/**
 * Format file size in human-readable form
 * @param {number} bytes File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
