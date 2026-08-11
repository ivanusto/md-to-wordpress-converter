/**
 * Helper to copy rich formatted HTML & plain text directly to the system clipboard
 * so it can be pasted with Ctrl+V directly into WordPress Visual Editor!
 */
export async function copyFormattedHtmlToClipboard(htmlContent: string, plainTextContent: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      // Modern Clipboard API with rich HTML blob
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const textBlob = new Blob([plainTextContent], { type: 'text/plain' });

      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });

      await navigator.clipboard.write([item]);
      return true;
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(htmlContent);
      return true;
    }
  } catch (err) {
    console.warn('ClipboardItem failed, trying fallback...', err);
  }

  // Fallback for document.execCommand
  try {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.pointerEvents = 'none';
    container.style.opacity = '0';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const success = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(container);
      if (success) return true;
    }
  } catch (e) {
    console.error('ExecCommand copy failed', e);
  }

  // Final fallback to text writeText
  try {
    await navigator.clipboard.writeText(plainTextContent);
    return true;
  } catch (err) {
    console.error('All copy methods failed', err);
    return false;
  }
}

export async function copyPlainTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
