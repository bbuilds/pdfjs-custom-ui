import { loadPdfFromData, loadPdfFromUrl } from './pdf-viewer.js';

/**
 * Sets up file handling for the PDF viewer
 */
export function setupFileHandling() {
  setupDragAndDrop();
  setupFileOpening();
}

/**
 * Sets up drag and drop functionality
 */
function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  const appElement = document.getElementById('app');
  
  // Show drop zone when dragging files over the document
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('hidden');
  });
  
  document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if the leave event is from the document (not from child elements)
    const rect = appElement.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      dropZone.classList.add('hidden');
    }
  });
  
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('hidden');
    
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check if the file is a PDF
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        await openPdfFile(file);
      } else {
        showErrorNotification('Please drop a PDF file.');
      }
    }
  });
  
  // Also hide drop zone when clicking outside of it
  dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone) {
      dropZone.classList.add('hidden');
    }
  });
}

/**
 * Sets up file opening via system dialogs
 */
function setupFileOpening() {
  // Listen for keyboard shortcut (Ctrl+O)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      openFileDialog();
    }
  });
  
  // File menu item in toolbar (could be added in the future)
}

/**
 * Opens a file dialog to select a PDF
 */
function openFileDialog() {
  // Create a file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/pdf,.pdf';
  fileInput.style.display = 'none';
  
  // Add to document and click to open dialog
  document.body.appendChild(fileInput);
  fileInput.click();
  
  // Handle file selection
  fileInput.addEventListener('change', async () => {
    if (fileInput.files.length > 0) {
      await openPdfFile(fileInput.files[0]);
    }
    
    // Remove the input element
    document.body.removeChild(fileInput);
  });
}

/**
 * Opens a PDF file
 * @param {File} file The PDF file to open
 */
async function openPdfFile(file) {
  try {
    // Read the file as an ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(file);
    
    // Load the PDF
    await loadPdfFromData(arrayBuffer, file.name);
  } catch (error) {
    console.error('Error opening PDF file:', error);
    showErrorNotification('Failed to open PDF file.');
  }
}

/**
 * Reads a file as an ArrayBuffer
 * @param {File} file The file to read
 * @returns {Promise<ArrayBuffer>} A promise that resolves to the file's contents as an ArrayBuffer
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Shows an error notification
 * @param {string} message The error message
 */
function showErrorNotification(message) {
  // Simple notification implementation
  alert(message);
}