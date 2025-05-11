/**
 * Creates an outline item element
 * @param {Object} item The outline item from the PDF
 * @param {PDFDocumentProxy} pdfDocument The PDF document
 * @returns {HTMLElement} The outline item element
 */
export function createOutlineItem(item, pdfDocument) {
  const listItem = document.createElement('li');
  listItem.className = 'outline-item';
  
  const link = document.createElement('a');
  link.href = '#';
  link.textContent = item.title || 'Untitled bookmark';
  
  // Add external link indicator if it's a URL
  if (item.url) {
    link.dataset.external = 'true';
    const icon = document.createElement('span');
    icon.className = 'external-link-icon';
    icon.innerHTML = ' (external)';
    link.appendChild(icon);
  }
  
  listItem.appendChild(link);
  
  // Add children if any
  if (item.items && item.items.length > 0) {
    const childList = document.createElement('ul');
    childList.className = 'outline-children';
    
    for (const childItem of item.items) {
      const childElement = createOutlineItem(childItem, pdfDocument);
      childList.appendChild(childElement);
    }
    
    listItem.appendChild(childList);
    
    // Add expand/collapse functionality
    listItem.classList.add('has-children');
    
    const toggle = document.createElement('span');
    toggle.className = 'outline-toggle';
    toggle.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 6L8.59 7.41L13.17 12L8.59 16.59L10 18L16 12L10 6Z" fill="currentColor"/>
      </svg>
    `;
    
    listItem.insertBefore(toggle, link);
    
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      listItem.classList.toggle('expanded');
    });
  }
  
  return listItem;
}