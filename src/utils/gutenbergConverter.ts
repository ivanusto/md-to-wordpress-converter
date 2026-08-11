/**
 * Converts standard HTML generated from Markdown into WordPress Gutenberg Block Comment format
 */
export function convertToGutenbergBlocks(html: string): string {
  // Temporary container element simulator via DOMParser if in browser
  if (typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) return html;

  const blocks: string[] = [];

  Array.from(container.children).forEach((node) => {
    const tagName = node.tagName.toLowerCase();
    const outerHtml = node.outerHTML.trim();

    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
      const level = parseInt(tagName.replace('h', ''), 10);
      blocks.push(`<!-- wp:heading {"level":${level}} -->\n${outerHtml}\n<!-- /wp:heading -->`);
    } else if (tagName === 'p') {
      blocks.push(`<!-- wp:paragraph -->\n${outerHtml}\n<!-- /wp:paragraph -->`);
    } else if (tagName === 'ul') {
      blocks.push(`<!-- wp:list {"ordered":false} -->\n${outerHtml}\n<!-- /wp:list -->`);
    } else if (tagName === 'ol') {
      blocks.push(`<!-- wp:list {"ordered":true} -->\n${outerHtml}\n<!-- /wp:list -->`);
    } else if (tagName === 'blockquote') {
      blocks.push(`<!-- wp:quote -->\n${outerHtml}\n<!-- /wp:quote -->`);
    } else if (tagName === 'figure' && node.classList.contains('wp-block-table')) {
      blocks.push(`<!-- wp:table -->\n${outerHtml}\n<!-- /wp:table -->`);
    } else if (tagName === 'figure' && node.classList.contains('wp-block-image')) {
      blocks.push(`<!-- wp:image {"sizeSlug":"full","linkDestination":"none"} -->\n${outerHtml}\n<!-- /wp:image -->`);
    } else if (tagName === 'div' && node.classList.contains('wp-code-wrapper')) {
      // Code wrapper
      const preCodeNode = node.querySelector('pre');
      const codeBlockHtml = preCodeNode ? preCodeNode.outerHTML : outerHtml;
      blocks.push(`<!-- wp:code -->\n${codeBlockHtml}\n<!-- /wp:code -->`);
    } else if (tagName === 'pre') {
      blocks.push(`<!-- wp:code -->\n${outerHtml}\n<!-- /wp:code -->`);
    } else if (tagName === 'div' && node.classList.contains('wp-callout-box')) {
      const className = node.className;
      blocks.push(`<!-- wp:group {"className":"${className}"} -->\n${outerHtml}\n<!-- /wp:group -->`);
    } else if (tagName === 'hr') {
      blocks.push(`<!-- wp:separator {"className":"is-style-wide"} -->\n<hr class="wp-block-separator has-alpha-channel-opacity is-style-wide"/>\n<!-- /wp:separator -->`);
    } else {
      // Fallback: wrap in html block or paragraph
      blocks.push(`<!-- wp:html -->\n${outerHtml}\n<!-- /wp:html -->`);
    }
  });

  return blocks.join('\n\n');
}
