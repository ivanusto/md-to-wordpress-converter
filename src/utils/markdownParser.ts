import { marked } from 'marked';
import hljs from 'highlight.js';
import type { FrontmatterData, ExtractedImage, MarkdownStats, ConverterOptions } from '../types';

export function parseFrontmatter(markdown: string): { frontmatter: FrontmatterData; content: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content: markdown };
  }

  const yamlStr = match[1];
  const content = markdown.replace(match[0], '');
  const frontmatter: FrontmatterData = {};

  let currentKey = '';

  yamlStr.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (trimmed.startsWith('- ') && currentKey) {
      const val = trimmed.slice(2).trim().replace(/^["']|["']$/g, '');
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = [];
      }
      (frontmatter[currentKey] as string[]).push(val);
      return;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();

      if (!key) return;
      currentKey = key;

      if (!value) {
        frontmatter[key] = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        const items = value
          .slice(1, -1)
          .split(',')
          .map((item) => item.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        frontmatter[key] = items;
      } else {
        value = value.replace(/^["']|["']$/g, '');
        frontmatter[key] = value;
      }
    }
  });

  ['categories', 'tags'].forEach((field) => {
    if (frontmatter[field] && typeof frontmatter[field] === 'string') {
      frontmatter[field] = [frontmatter[field] as string];
    }
  });

  return { frontmatter, content };
}

export function extractImages(markdown: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  let index = 0;
  while ((match = mdImgRegex.exec(markdown)) !== null) {
    const altText = match[1];
    let url = match[2].trim();
    if (url.includes(' ')) {
      url = url.split(' ')[0];
    }

    const isLocal = !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:');

    images.push({
      id: `img-${index++}`,
      originalUrl: url,
      altText: altText || `Image ${index}`,
      isLocal,
    });
  }

  return images;
}

export function calculateStats(markdown: string): MarkdownStats {
  const charCount = markdown.length;
  const words = markdown
    .replace(/[#*`~_>\-\[\]()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = words.length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 300));

  const headingCount = (markdown.match(/^#{1,6}\s+/gm) || []).length;
  const imageCount = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const codeBlockCount = (markdown.match(/```[\s\S]*?```/g) || []).length;
  const tableCount = (markdown.match(/\|.*\|/g) || []).length > 0 ? (markdown.match(/(?:\|.*\|\r?\n){2,}/g) || []).length : 0;

  return {
    charCount,
    wordCount,
    readTimeMinutes,
    headingCount,
    imageCount,
    codeBlockCount,
    tableCount,
  };
}

export function parseMarkdownToHtml(
  markdown: string,
  imageReplacements: Record<string, string> = {},
  options: ConverterOptions
): string {
  const renderer = new marked.Renderer();

  renderer.heading = ({ text, depth }) => {
    const slug = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const idAttr = options.addHeadingIds && slug ? ` id="${slug}"` : '';
    return `<h${depth}${idAttr} class="wp-block-heading">${text}</h${depth}>\n`;
  };

  renderer.link = ({ href, title, text }) => {
    const titleAttr = title ? ` title="${title}"` : '';
    const targetAttr = options.openLinksInNewTab && href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
  };

  renderer.image = ({ href, title, text }) => {
    let finalSrc = imageReplacements[href] || href;
    if (options.customImagePrefix && !finalSrc.startsWith('http') && !finalSrc.startsWith('data:')) {
      finalSrc = `${options.customImagePrefix.replace(/\/$/, '')}/${finalSrc.replace(/^\//, '')}`;
    }
    const titleAttr = title ? ` title="${title}"` : '';
    const figCaption = text ? `<figcaption class="wp-element-caption">${text}</figcaption>` : '';
    return `<figure class="wp-block-image size-full"><img src="${finalSrc}" alt="${text || ''}"${titleAttr} />${figCaption}</figure>\n`;
  };

  renderer.code = ({ text, lang }) => {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    let highlighted: string;
    try {
      highlighted = hljs.highlight(text, { language }).value;
    } catch {
      highlighted = marked.parseInline(text) as string;
    }

    const langLabel = lang ? `<span class="code-lang-badge">${lang.toUpperCase()}</span>` : '';
    return `<div class="wp-code-wrapper"><pre class="wp-block-code"><code class="hljs language-${language}">${highlighted}</code></pre>${langLabel}</div>\n`;
  };

  renderer.table = (token) => {
    let headerHtml = '';
    let bodyHtml = '';

    const headerRow = token.header.map((cell) => {
      const alignAttr = cell.align ? ` style="text-align:${cell.align}"` : '';
      return `<th${alignAttr}>${marked.parseInline(cell.text)}</th>`;
    }).join('');
    headerHtml = `<thead><tr>${headerRow}</tr></thead>`;

    const bodyRows = token.rows.map((row) => {
      const cells = row.map((cell) => {
        const alignAttr = cell.align ? ` style="text-align:${cell.align}"` : '';
        return `<td${alignAttr}>${marked.parseInline(cell.text)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    bodyHtml = `<tbody>${bodyRows}</tbody>`;

    return `<figure class="wp-block-table"><table class="has-fixed-layout">${headerHtml}${bodyHtml}</table></figure>\n`;
  };

  renderer.blockquote = (token) => {
    const rawQuote = token.text;
    const calloutMatch = rawQuote.match(/^\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\](?:\r?\n|<br\s*\/?>|\s+)([\s\S]*)$/i);

    if (calloutMatch) {
      const type = calloutMatch[1].toUpperCase();
      const content = calloutMatch[2].trim();
      const parsedContent = marked.parse(content, { renderer }) as string;

      let icon = 'ℹ️';
      let title = '提示';
      let typeClass = 'note';

      switch (type) {
        case 'WARNING':
          icon = '⚠️';
          title = '警告 / 注意事項';
          typeClass = 'warning';
          break;
        case 'TIP':
          icon = '💡';
          title = '實用技巧';
          typeClass = 'tip';
          break;
        case 'IMPORTANT':
          icon = '❗';
          title = '重要說明';
          typeClass = 'important';
          break;
        case 'CAUTION':
          icon = '🛑';
          title = '嚴正提醒';
          typeClass = 'caution';
          break;
        default:
          icon = 'ℹ️';
          title = '溫馨提示';
          typeClass = 'note';
          break;
      }

      return `<div class="wp-block-group wp-callout-box wp-callout-${typeClass}"><div class="wp-callout-header"><span class="wp-callout-icon">${icon}</span> <strong class="wp-callout-title">${title}</strong></div><div class="wp-callout-content">${parsedContent}</div></div>\n`;
    }

    const parsed = marked.parse(rawQuote) as string;
    return `<blockquote class="wp-block-quote">${parsed}</blockquote>\n`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
  });

  return marked.parse(markdown) as string;
}
