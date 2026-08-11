import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { MarkdownEditor } from './components/MarkdownEditor';
import { PreviewPanel } from './components/PreviewPanel';
import { SettingsModal } from './components/SettingsModal';
import { SAMPLE_MARKDOWN } from './utils/sampleMarkdown';
import {
  parseFrontmatter,
  extractImages,
  calculateStats,
  parseMarkdownToHtml,
} from './utils/markdownParser';
import { convertToGutenbergBlocks } from './utils/gutenbergConverter';
import type { ConverterOptions, ParsedMarkdownResult, ThemeStyle } from './types';
import { CheckCircle2 } from 'lucide-react';

const DEFAULT_OPTIONS: ConverterOptions = {
  openLinksInNewTab: true,
  addHeadingIds: true,
  themeStyle: 'wordpress',
  codeTheme: 'vscode',
  customImagePrefix: '',
  convertCalloutsToGutenberg: true,
  includeFrontmatterInOutput: false,
};

export function App() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_MARKDOWN);
  const [options, setOptions] = useState<ConverterOptions>(DEFAULT_OPTIONS);
  const [imageReplacements, setImageReplacements] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const parsedResult: ParsedMarkdownResult = useMemo(() => {
    const { frontmatter, content } = parseFrontmatter(markdown);
    const images = extractImages(content);
    const stats = calculateStats(markdown);
    const htmlContent = parseMarkdownToHtml(content, imageReplacements, options);
    const gutenbergContent = convertToGutenbergBlocks(htmlContent);

    return {
      frontmatter,
      rawMarkdown: markdown,
      contentMarkdown: content,
      htmlContent,
      gutenbergContent,
      images,
      stats,
    };
  }, [markdown, imageReplacements, options]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (typeof text === 'string') {
        setMarkdown(text);
        showToast(`已成功讀取檔案: ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    const blob = new Blob([parsedResult.gutenbergContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${parsedResult.frontmatter.slug || 'wordpress-article'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('檔案下載成功！');
  };

  const handleUpdateImageReplacement = (originalUrl: string, newUrl: string) => {
    setImageReplacements((prev) => ({
      ...prev,
      [originalUrl]: newUrl,
    }));
  };

  return (
    <div className="app-layout">
      {toastMessage && (
        <div className="toast-notification animate-slide-down">
          <CheckCircle2 className="icon-md text-green shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Header
        onLoadSample={() => {
          setMarkdown(SAMPLE_MARKDOWN);
          showToast('已載入範例 Markdown 文章');
        }}
        onClear={() => {
          setMarkdown('');
          showToast('內容已清空');
        }}
        onFileUpload={handleFileUpload}
        onDownload={handleDownload}
        onOpenSettings={() => setIsSettingsOpen(true)}
        themeStyle={options.themeStyle}
        onThemeStyleChange={(themeStyle: ThemeStyle) =>
          setOptions((prev) => ({ ...prev, themeStyle }))
        }
        hasContent={Boolean(markdown.trim())}
      />

      <main className="main-content-split">
        <MarkdownEditor
          value={markdown}
          onChange={setMarkdown}
          onFileUpload={handleFileUpload}
          stats={parsedResult.stats}
        />

        <PreviewPanel
          parsedResult={parsedResult}
          options={options}
          imageReplacements={imageReplacements}
          onUpdateImageReplacement={handleUpdateImageReplacement}
          onShowToast={showToast}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onOptionsChange={setOptions}
      />

      <footer className="app-footer">
        <div className="footer-credits">
          <span>WP-Markdown Converter</span>
          <span className="footer-divider">•</span>
          <span>作者: <a href="https://github.com/ivanusto" target="_blank" rel="noopener noreferrer">Ivan Lin (@ivanusto)</a></span>
          <span className="footer-divider">•</span>
          <span>部落格: <a href="https://yblog.org/" target="_blank" rel="noopener noreferrer">優格網</a></span>
          <span className="footer-divider">•</span>
          <span>專案 Repo: <a href="https://github.com/ivanusto/md-to-wordpress-converter" target="_blank" rel="noopener noreferrer">md-to-wordpress-converter</a></span>
        </div>
      </footer>
    </div>
  );
}

export default App;
