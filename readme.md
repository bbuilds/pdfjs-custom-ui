# PDF.js Viewer

A modern, responsive PDF viewer built with PDF.js that provides a clean and intuitive interface for reading PDF documents in the browser.

## Live Demo

[https://bbuilds.github.io/pdfjs-custom-ui/](https://bbuilds.github.io/pdfjs-custom-ui/)

## Features

- 📄 Render and display PDF documents with high fidelity
- 🔎 Zoom in/out and fit-to-page functionality
- 📚 Document outline/bookmarks navigation
- 🖼️ Page thumbnails for quick navigation
- 🔍 Text search functionality
- 📱 Responsive design that works across devices
- ⌨️ Keyboard shortcuts for common actions

## Technologies Used

- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering engine by Mozilla
- Vanilla JavaScript - For functionality and interactivity
- Modern CSS - For styling and animations
- Vite - For development and building

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/bbuilds/pdfjs-viewer.git
cd pdfjs-viewer
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

4. Build for production

```bash
npm run build
```

## Usage

- **Open PDF**: Drag and drop a PDF file onto the viewer, or use Ctrl+O (Cmd+O on Mac) to open file dialog
- **Navigation**: Use the toolbar buttons or arrow keys to navigate between pages
- **Zoom**: Use the zoom controls or keyboard shortcuts (+/-)
- **Search**: Click the search icon or press Ctrl+F to search within the document
- **Fullscreen**: Click the fullscreen button or press F key

## Keyboard Shortcuts

- `→`: Next page
- `←`: Previous page
- `F`: Toggle fullscreen
- `Esc`: Close search or exit fullscreen

## Browser Compatibility

The viewer is compatible with modern browsers that support ES6+ features:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Acknowledgments

- [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) - The core PDF rendering engine
- [Vite](https://vitejs.dev/) - Fast development and building

## License

This project is licensed under the MIT License - see the LICENSE file for details.
