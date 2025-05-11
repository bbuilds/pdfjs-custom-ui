/**
 * Loads PDF.js dynamically
 * @returns {Promise} A promise that resolves to the pdfjsLib object
 */
export async function loadPdfJs() {
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }
  
  try {
    // Import PDF.js from node_modules
    const pdfjs = await import('pdfjs-dist');
    
    // Set workerSrc
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
     pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
    
    // Store pdfjsLib in window for future use
    window.pdfjsLib = pdfjs;
    
    return pdfjs;
  } catch (error) {
    console.error('Error loading PDF.js:', error);
    throw new Error('Failed to load PDF.js library');
  }
}