export interface FrontmatterData {
  title?: string;
  slug?: string;
  categories?: string[];
  tags?: string[];
  excerpt?: string;
  date?: string;
  coverImage?: string;
  author?: string;
  [key: string]: any;
}

export interface ExtractedImage {
  id: string;
  originalUrl: string;
  altText: string;
  isLocal: boolean;
  replacementUrl?: string;
}

export interface MarkdownStats {
  charCount: number;
  wordCount: number;
  readTimeMinutes: number;
  headingCount: number;
  imageCount: number;
  codeBlockCount: number;
  tableCount: number;
}

export interface ParsedMarkdownResult {
  frontmatter: FrontmatterData;
  rawMarkdown: string;
  contentMarkdown: string;
  htmlContent: string;
  gutenbergContent: string;
  images: ExtractedImage[];
  stats: MarkdownStats;
}

export type ViewMode = 'visual' | 'gutenberg' | 'html' | 'metadata' | 'images';
export type ThemeStyle = 'wordpress' | 'editorial' | 'dark' | 'corporate';
export type CodeTheme = 'github' | 'monokai' | 'dracula' | 'vscode' | 'one-dark';

export interface ConverterOptions {
  openLinksInNewTab: boolean;
  addHeadingIds: boolean;
  themeStyle: ThemeStyle;
  codeTheme: CodeTheme;
  customImagePrefix: string;
  convertCalloutsToGutenberg: boolean;
  includeFrontmatterInOutput: boolean;
}
