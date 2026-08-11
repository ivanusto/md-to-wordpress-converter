import React from 'react';
import {
  Upload,
  Download,
  RotateCcw,
  Sparkles,
  Settings,
  Globe,
  FileCode2,
} from 'lucide-react';
import type { ThemeStyle } from '../types';

interface HeaderProps {
  onLoadSample: () => void;
  onClear: () => void;
  onFileUpload: (file: File) => void;
  onDownload: () => void;
  onOpenSettings: () => void;
  themeStyle: ThemeStyle;
  onThemeStyleChange: (theme: ThemeStyle) => void;
  hasContent: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  onClear,
  onFileUpload,
  onDownload,
  onOpenSettings,
  themeStyle,
  onThemeStyleChange,
  hasContent,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <Globe className="icon-wp" />
          <FileCode2 className="icon-md" />
        </div>
        <div className="brand-titles">
          <h1 className="brand-title">
            WP-Markdown <span className="badge-gutenberg">Gutenberg Ready</span>
          </h1>
          <p className="brand-subtitle">
            Markdown 轉 WordPress 快捷貼上 & Gutenberg 區塊轉換器
          </p>
        </div>
      </div>

      <div className="header-controls">
        <div className="header-external-links">
          <a
            href="https://yblog.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm link-btn"
            title="造訪 歪部落 yBlog"
          >
            <Globe className="icon-sm text-blue" />
            <span>yBlog</span>
          </a>
          <a
            href="https://github.com/ivanusto"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm link-btn"
            title="造訪 Ivan Lin 的 GitHub"
          >
            <svg className="icon-sm" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>GitHub</span>
          </a>
        </div>

        <div className="theme-selector-wrapper">
          <span className="control-label">排版風格:</span>
          <select
            value={themeStyle}
            onChange={(e) => onThemeStyleChange(e.target.value as ThemeStyle)}
            className="select-theme"
          >
            <option value="wordpress">WordPress Gutenberg (預設)</option>
            <option value="editorial">Editorial 質感排版 (Serif)</option>
            <option value="dark">Tech 暗色極客 (Dark)</option>
            <option value="corporate">Corporate 商務藍 (Slate)</option>
          </select>
        </div>

        <div className="action-buttons-group">
          <button
            onClick={onLoadSample}
            className="btn btn-secondary btn-sm"
            title="載入帶有範例文章的 Markdown"
          >
            <Sparkles className="icon-sm text-amber" />
            <span>載入範例</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".md,.markdown,.txt"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary btn-sm"
            title="開啟本地 .md 或 .txt 檔案"
          >
            <Upload className="icon-sm" />
            <span>匯入 .md</span>
          </button>

          {hasContent && (
            <>
              <button
                onClick={onDownload}
                className="btn btn-secondary btn-sm"
                title="下載轉換後的內容檔"
              >
                <Download className="icon-sm" />
                <span>下載</span>
              </button>

              <button
                onClick={onClear}
                className="btn btn-ghost btn-sm text-red"
                title="清空內容"
              >
                <RotateCcw className="icon-sm" />
                <span>清空</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenSettings}
            className="btn btn-icon"
            title="轉換選項設定"
          >
            <Settings className="icon-md" />
          </button>
        </div>
      </div>
    </header>
  );
};
