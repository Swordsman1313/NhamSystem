/**
 * Helper to trigger browser print without printing browser headers/footers,
 * while setting a clean document title so "Save as PDF" defaults to the
 * requested filename (e.g. INV-2610-001.pdf).
 */
export function triggerCleanPrint(filename?: string) {
  if (typeof window === 'undefined') return;

  const originalTitle = document.title;
  // Set the document title to the filename so "Save as PDF" names the file accurately
  if (filename && filename.trim()) {
    document.title = filename.trim();
  } else {
    document.title = '';
  }

  window.print();

  // Restore the original document title after user closes print dialog
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}
