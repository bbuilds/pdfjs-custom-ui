/**
 * Creates a thumbnail element for a PDF page
 * @param {PDFPageProxy} page The PDF page
 * @param {number} pageNumber The page number
 * @returns {HTMLElement} The thumbnail element
 */
export async function createThumbnail(page, pageNumber) {
  // Create container for the thumbnail
  const thumbnailContainer = document.createElement('div');
  thumbnailContainer.className = 'thumbnail';
  thumbnailContainer.dataset.pageNumber = pageNumber;
  
  // Create canvas for rendering the thumbnail
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Calculate thumbnail size (width: 150px)
  const viewport = page.getViewport({ scale: 1.0 });
  const scale = 150 / viewport.width;
  const scaledViewport = page.getViewport({ scale });
  
  // Set canvas dimensions
  canvas.height = scaledViewport.height;
  canvas.width = scaledViewport.width;
  
  // Render the page to the canvas
  try {
    await page.render({
      canvasContext: context,
      viewport: scaledViewport
    }).promise;
    
    // Add page number label
    const label = document.createElement('div');
    label.className = 'thumbnail-label';
    label.textContent = pageNumber;
    
    // Add to container
    thumbnailContainer.appendChild(canvas);
    thumbnailContainer.appendChild(label);
    
    return thumbnailContainer;
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    
    // Create error thumbnail
    thumbnailContainer.innerHTML = `
      <div class="thumbnail-error">
        <div class="thumbnail-label">${pageNumber}</div>
      </div>
    `;
    
    return thumbnailContainer;
  }
}