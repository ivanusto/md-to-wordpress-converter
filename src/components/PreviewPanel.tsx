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
import type { ViewMode, ParsedMarkdownResult, ConverterOptions } from '../types';
import { MetadataView } from './MetadataView';
import { ImageManager } from './ImageManager';
import { copyFormattedHtmlToClipboard, copyPlainTextToClipboard } from '../utils/clipboardHelper';

interface PreviewPanelProps {
  parsedResult: ParsedMarkdownResult;
  options: ConverterOptions;
  imageReplacements: Record<string, string>;
  onUpdateImageReplacement: (originalUrl: string, newUrl: string) => void;
  onShowToast: (message: string) => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  parsedResult,
  options,
  imageReplacements,
  onUpdateImageReplacement,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  const { frontmatter, htmlContent, gutenbergContent, images } = parsedResult;

  const handleCopyForWordPress = async () => {
    const success = await copyFormattedHtmlToClipboard(htmlContent, parsedResult.contentMarkdown);
    if (success) {
      setCopiedMode('visual');
      onShowToast('🚀 已成功複製格式化內容！請直接在 WordPress 視覺化編輯器按 Ctrl + V 貼上！');
      setTimeout(() => setCopiedMode(null), 3000);
    }
  };

  const handleCopyGutenberg = async () => {
    const success = await copyPlainTextToClipboard(gutenbergContent);
    if (success) {
      setCopiedMode('gutenberg');
      onShowToast('🧱 已複製 Gutenberg 區塊語法！可貼入 WordPress 程式碼編輯器中！');
      setTimeout(() => setCopiedMode(null), 3000);
    }
  };

  const handleCopyHtml = async () => {
    const success = await copyPlainTextToClipboard(htmlContent);
    if (success) {
      setCopiedMode('html');
      onShowToast('🏷️ 已複製 HTML 原生碼！');
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
            <span>視覺預覽 & 直接貼上</span>
          </button>

          <button
            className={`tab-btn ${viewMode === 'gutenberg' ? 'active' : ''}`}
            onClick={() => setViewMode('gutenberg')}
          >
            <Box className="icon-xs" />
            <span>Gutenberg 區塊碼</span>
          </button>

          <button
            className={`tab-btn ${viewMode === 'html' ? 'active' : ''}`}
            onClick={() => setViewMode('html')}
          >
            <Code2 className="icon-xs" />
            <span>HTML 碼</span>
          </button>

          <button
            className={`tab-btn ${viewMode === 'metadata' ? 'active' : ''}`}
            onClick={() => setViewMode('metadata')}
          >
            <FileSpreadsheet className="icon-xs" />
            <span>文章元數據</span>
            {Object.keys(frontmatter).length > 0 && <span className="tab-badge">{Object.keys(frontmatter).length}</span>}
          </button>

          <button
            className={`tab-btn ${viewMode === 'images' ? 'active' : ''}`}
            onClick={() => setViewMode('images')}
          >
            <ImageIcon className="icon-xs" />
            <span>圖片管理</span>
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
              <span>{copiedMode === 'gutenberg' ? '區塊語法已複製！' : '複製 Gutenberg 區塊碼'}</span>
            </button>
          ) : viewMode === 'html' ? (
            <button className="btn btn-primary" onClick={handleCopyHtml}>
              {copiedMode === 'html' ? <Check className="icon-sm text-green animate-scale" /> : <Copy className="icon-sm" />}
              <span>{copiedMode === 'html' ? 'HTML 已複製！' : '複製 HTML 碼'}</span>
            </button>
          ) : (
            <button className="btn btn-primary btn-lg pulse-glow" onClick={handleCopyForWordPress}>
              {copiedMode === 'visual' ? (
                <CheckCircle2 className="icon-md text-green animate-scale" />
              ) : (
                <Zap className="icon-md text-amber" />
              )}
              <span>{copiedMode === 'visual' ? '已成功複製！請在 WP 編輯器 Ctrl+V' : '複製並直接貼到 WordPress'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="preview-viewport">
        {viewMode === 'visual' && (
          <div className="visual-preview-wrapper">
            <div className="wp-paste-hint-banner">
              <span className="hint-pill">💡 WordPress 貼上指南</span>
              <span>
                點擊上方 <strong>「複製並直接貼到 WordPress」</strong> 後，切換至 WordPress 的
                <span className="highlight-text">視覺化編輯器</span>（Visual Editor），直接按 <code>Ctrl + V</code> 即可完整還原標題、表格與程式碼！
              </span>
            </div>

            <div className={`wp-content-frame theme-style-${options.themeStyle} code-theme-${options.codeTheme}`}>
              {frontmatter.title && <h1 className="wp-post-title">{frontmatter.title}</h1>}
              <div
                className="entry-content"
                dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="placeholder-text">無內容可預覽</p>' }}
              />
            </div>
          </div>
        )}

        {viewMode === 'gutenberg' && (
          <div className="code-view-wrapper">
            <div className="code-info-banner">
              <span>
                此語法包含 WordPress Gutenberg 區塊註解 (如 <code>&lt;!-- wp:paragraph --&gt;</code>
                )。貼入 WordPress 的「程式碼編輯器」模式中，可自動轉化為原生區塊。
              </span>
              <button className="btn btn-xs btn-secondary" onClick={handleCopyGutenberg}>
                <Copy className="icon-xs" />
                <span>複製語法</span>
              </button>
            </div>
            <textarea className="code-textarea" value={gutenbergContent} readOnly spellCheck={false} />
          </div>
        )}

        {viewMode === 'html' && (
          <div className="code-view-wrapper">
            <div className="code-info-banner">
              <span>乾淨且標準的 HTML 結構，適合貼入 WordPress「自訂 HTML」區塊或傳統編輯器 HTML 模式。</span>
              <button className="btn btn-xs btn-secondary" onClick={handleCopyHtml}>
                <Copy className="icon-xs" />
                <span>複製 HTML</span>
              </button>
            </div>
            <textarea className="code-textarea" value={htmlContent} readOnly spellCheck={false} />
          </div>
        )}

        {viewMode === 'metadata' && (
          <MetadataView frontmatter={frontmatter} onCopiedToast={onShowToast} />
        )}

        {viewMode === 'images' && (
          <ImageManager
            images={images}
            imageReplacements={imageReplacements}
            onUpdateReplacement={onUpdateImageReplacement}
          />
        )}
      </div>
    </div>
  );
};
