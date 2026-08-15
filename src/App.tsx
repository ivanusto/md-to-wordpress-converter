import { useState, useMemo, useEffect } from 'react';
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
import type { ConverterOptions, ParsedMarkdownResult, ThemeStyle, AppLanguage } from './types';
import { CheckCircle2 } from 'lucide-react';
import { t } from './utils/i18n';

const DEFAULT_OPTIONS: ConverterOptions = {
  openLinksInNewTab: true,
  addHeadingIds: true,
  themeStyle: 'wordpress',
  codeTheme: 'vscode',
  customImagePrefix: '',
  convertCalloutsToGutenberg: true,
  includeFrontmatterInOutput: false,
};

function getInitialLanguage(): AppLanguage {
  const saved = localStorage.getItem('wp_md_lang');
  if (saved === 'zh-TW' || saved === 'en') return saved;
  const userLangs = navigator.languages || [navigator.language || ''];
  for (const lang of userLangs) {
    if (lang && lang.toLowerCase().startsWith('zh')) return 'zh-TW';
  }
  return 'en';
}

export function App() {
  const [lang, setLang] = useState<AppLanguage>(getInitialLanguage);
  const [markdown, setMarkdown] = useState<string>(SAMPLE_MARKDOWN);
  const [options, setOptions] = useState<ConverterOptions>(DEFAULT_OPTIONS);
  const [imageReplacements, setImageReplacements] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('wp_md_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'zh-TW' ? 'en' : 'zh-TW'));
  };

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
        showToast(t('toast.fileLoaded', lang, { name: file.name }));
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
    showToast(t('toast.downloadSuccess', lang));
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
          showToast(t('toast.sampleLoaded', lang));
        }}
        onClear={() => {
          setMarkdown('');
          showToast(t('toast.cleared', lang));
        }}
        onFileUpload={handleFileUpload}
        onDownload={handleDownload}
        onOpenSettings={() => setIsSettingsOpen(true)}
        themeStyle={options.themeStyle}
        onThemeStyleChange={(themeStyle: ThemeStyle) =>
          setOptions((prev) => ({ ...prev, themeStyle }))
        }
        hasContent={Boolean(markdown.trim())}
        lang={lang}
        onToggleLang={toggleLanguage}
      />

      <main className="main-content-split">
        <MarkdownEditor
          value={markdown}
          onChange={setMarkdown}
          onFileUpload={handleFileUpload}
          stats={parsedResult.stats}
          lang={lang}
        />

        <PreviewPanel
          parsedResult={parsedResult}
          options={options}
          imageReplacements={imageReplacements}
          onUpdateImageReplacement={handleUpdateImageReplacement}
          onShowToast={showToast}
          lang={lang}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onOptionsChange={setOptions}
        lang={lang}
      />

      <footer className="app-footer">
        <div className="footer-links">
          <a href="https://ivanusto.github.io/watermarks-remover/" target="_blank" rel="noopener noreferrer">
            {t('footer.linkWm', lang)}
          </a>
          <span className="footer-divider">•</span>
          <a href="https://ivanusto.github.io/image-aspect-ratio-calculator/" target="_blank" rel="noopener noreferrer">
            {t('footer.linkRatio', lang)}
          </a>
          <span className="footer-divider">•</span>
          <a href="https://github.com/ivanusto/md-to-wordpress-converter" target="_blank" rel="noopener noreferrer">
            {t('footer.linkRepo', lang)}
          </a>
          <span className="footer-divider">•</span>
          <a href="https://yblog.org/" target="_blank" rel="noopener noreferrer">
            {t('footer.linkBlog', lang)}
          </a>
        </div>
        <div className="footer-credits">
          <span>{t('footer.credits', lang)}</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
