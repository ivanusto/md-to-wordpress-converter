import React, { useState } from 'react';
import {
  Eye,
  Box,
  Code2,
  FileSpreadsheet,
  Image as ImageIcon,
  Copy,
  Check,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import type { ViewMode, ParsedMarkdownResult, ConverterOptions, AppLanguage } from '../types';
import { MetadataView } from './MetadataView';
import { ImageManager } from './ImageManager';
import { copyFormattedHtmlToClipboard, copyPlainTextToClipboard } from '../utils/clipboardHelper';
import { t } from '../utils/i18n';

interface PreviewPanelProps {
  parsedResult: ParsedMarkdownResult;
  options: ConverterOptions;
  imageReplacements: Record<string, string>;
  onUpdateImageReplacement: (originalUrl: string, newUrl: string) => void;
  onShowToast: (message: string) => void;
  lang: AppLanguage;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  parsedResult,
  options,
  imageReplacements,
  onUpdateImageReplacement,
  onShowToast,
  lang,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  const { frontmatter, htmlContent, gutenbergContent, images } = parsedResult;

  const handleCopyForWordPress = async () => {
    const success = await copyFormattedHtmlToClipboard(htmlContent, parsedResult.contentMarkdown);
    if (success) {
      setCopiedMode('visual');
      onShowToast(t('toast.copiedVisual', lang));
      setTimeout(() => setCopiedMode(null), 3000);
    }
  };

  const handleCopyGutenberg = async () => {
    const success = await copyPlainTextToClipboard(gutenbergContent);
    if (success) {
      setCopiedMode('gutenberg');
      onShowToast(t('toast.copiedGutenberg', lang));
      setTimeout(() => setCopiedMode(null), 3000);
    }
  };

  const handleCopyHtml = async () => {
    const success = await copyPlainTextToClipboard(htmlContent);
    if (success) {
      setCopiedMode('html');
      onShowToast(t('toast.copiedHtml', lang));
      setTimeout(() => setCopiedMode(null), 3000);
    }
  };

  return (
    <div className="preview-panel-container">
      <div className="preview-toolbar">
        <div className="view-mode-tabs">
          <button
            className={`tab-btn ${viewMode === 'visual' ? 'active' : ''}`}
            onClick={() => setViewMode('visual')}
          >
            <Eye className="icon-xs" />
            <span>{t('preview.tabVisual', lang)}</span>
          </button>

          <button
            className={`tab-btn ${viewMode === 'gutenberg' ? 'active' : ''}`}
            onClick={() => setViewMode('gutenberg')}
          >
            <Box className="icon-xs" />
            <span>{t('preview.tabGutenberg', lang)}</span>
          </button>

          <button
            className={`tab-btn ${viewMode === 'html' ? 'active' : ''}`}
            onClick={() => setViewMode('html')}
          >
            <Code2 className="icon-xs" />
            <span>{t('preview.tabHtml', lang)}</span>
          </button>

          <button
            className={`tab-btn ${viewMode === 'metadata' ? 'active' : ''}`}
            onClick={() => setViewMode('metadata')}
          >
            <FileSpreadsheet className="icon-xs" />
            <span>{t('preview.tabMetadata', lang)}</span>
            {Object.keys(frontmatter).length > 0 && <span className="tab-badge">{Object.keys(frontmatter).length}</span>}
          </button>

          <button
            className={`tab-btn ${viewMode === 'images' ? 'active' : ''}`}
            onClick={() => setViewMode('images')}
          >
            <ImageIcon className="icon-xs" />
            <span>{t('preview.tabImages', lang)}</span>
            {images.length > 0 && (
              <span className={`tab-badge ${images.some((img) => img.isLocal) ? 'badge-warning' : ''}`}>
                {images.length}
              </span>
            )}
          </button>
        </div>

        <div className="quick-copy-bar">
          {viewMode === 'gutenberg' ? (
            <button className="btn btn-primary" onClick={handleCopyGutenberg}>
              {copiedMode === 'gutenberg' ? <Check className="icon-sm text-green animate-scale" /> : <Copy className="icon-sm" />}
              <span>{copiedMode === 'gutenberg' ? t('preview.copied', lang) : t('preview.btnCopyGutenberg', lang)}</span>
            </button>
          ) : viewMode === 'html' ? (
            <button className="btn btn-primary" onClick={handleCopyHtml}>
              {copiedMode === 'html' ? <Check className="icon-sm text-green animate-scale" /> : <Copy className="icon-sm" />}
              <span>{copiedMode === 'html' ? t('preview.copied', lang) : t('preview.btnCopyHtml', lang)}</span>
            </button>
          ) : (
            <button className="btn btn-primary btn-lg pulse-glow" onClick={handleCopyForWordPress}>
              {copiedMode === 'visual' ? (
                <CheckCircle2 className="icon-md text-green animate-scale" />
              ) : (
                <Zap className="icon-md text-amber" />
              )}
              <span>{copiedMode === 'visual' ? t('preview.copied', lang) : t('preview.btnCopyVisual', lang)}</span>
            </button>
          )}
        </div>
      </div>

      <div className="preview-viewport">
        {viewMode === 'visual' && (
          <div className="visual-preview-wrapper">
            <div className="wp-paste-hint-banner">
              <span className="hint-pill">💡 {lang === 'zh-TW' ? 'WordPress 貼上指南' : 'WordPress Paste Guide'}</span>
              <span>
                {lang === 'zh-TW' ? (
                  <>
                    點擊上方 <strong>「複製並直接貼入 WordPress」</strong> 後，切換至 WordPress 的
                    <span className="highlight-text">視覺化編輯器</span>（Visual Editor），直接按 <code>Ctrl + V</code> 即可完整還原標題、表格與程式碼！
                  </>
                ) : (
                  <>
                    Click <strong>"Copy for WordPress Direct Paste"</strong> above, switch to WordPress <span className="highlight-text">Visual Editor</span>, and press <code>Ctrl + V</code> directly!
                  </>
                )}
              </span>
            </div>

            <div className={`wp-content-frame theme-style-${options.themeStyle} code-theme-${options.codeTheme}`}>
              {frontmatter.title && <h1 className="wp-post-title">{frontmatter.title}</h1>}
              <div
                className="entry-content"
                dangerouslySetInnerHTML={{ __html: htmlContent || `<p class="placeholder-text">${t('preview.empty', lang)}</p>` }}
              />
            </div>
          </div>
        )}

        {viewMode === 'gutenberg' && (
          <div className="code-view-wrapper">
            <div className="code-info-banner">
              <span>
                {lang === 'zh-TW' 
                  ? '此語法包含 WordPress Gutenberg 區塊註解 (如 <!-- wp:paragraph -->)。貼入 WordPress 的「程式碼編輯器」模式中，可自動轉化為原生區塊。'
                  : 'Contains Gutenberg block comments (e.g. <!-- wp:paragraph -->). Paste into WordPress Code Editor mode to convert to blocks.'}
              </span>
              <button className="btn btn-xs btn-secondary" onClick={handleCopyGutenberg}>
                <Copy className="icon-xs" />
                <span>{t('preview.btnCopyGutenberg', lang)}</span>
              </button>
            </div>
            <textarea className="code-textarea" value={gutenbergContent} readOnly spellCheck={false} />
          </div>
        )}

        {viewMode === 'html' && (
          <div className="code-view-wrapper">
            <div className="code-info-banner">
              <span>
                {lang === 'zh-TW'
                  ? '乾淨且標準的 HTML 結構，適合貼入 WordPress「自訂 HTML」區塊或傳統編輯器 HTML 模式。'
                  : 'Clean standard HTML structure, suitable for Custom HTML blocks or Classic Editor.'}
              </span>
              <button className="btn btn-xs btn-secondary" onClick={handleCopyHtml}>
                <Copy className="icon-xs" />
                <span>{t('preview.btnCopyHtml', lang)}</span>
              </button>
            </div>
            <textarea className="code-textarea" value={htmlContent} readOnly spellCheck={false} />
          </div>
        )}

        {viewMode === 'metadata' && (
          <MetadataView frontmatter={frontmatter} onCopiedToast={onShowToast} lang={lang} />
        )}

        {viewMode === 'images' && (
          <ImageManager
            images={images}
            imageReplacements={imageReplacements}
            onUpdateReplacement={onUpdateImageReplacement}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
};
