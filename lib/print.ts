/**
 * Helper to trigger browser print without printing browser headers/footers,
 * while setting a clean document title so "Save as PDF" defaults to the
 * requested filename (e.g. INV-2610-001.pdf).
 */
export function triggerCleanPrint(filename?: string) {
  if (typeof window === 'undefined') return;

  const originalTitle = document.title;
  const cleanName = filename?.trim();

  if (cleanName) {
    document.title = cleanName;
  }

  // Restore the original document title after user finishes or cancels printing
  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    document.title = originalTitle;
  };

  window.addEventListener('afterprint', cleanup);

  window.print();
}
