/**
 * Helper to trigger browser print without printing the document title,
 * timestamp, or localhost URL in the browser header/footer.
 */
export function triggerCleanPrint() {
  if (typeof window === 'undefined') return;

  const originalTitle = document.title;
  // Clear the title temporarily before the print dialog opens
  document.title = '';

  window.print();

  // Restore the original document title after user closes print dialog
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}
