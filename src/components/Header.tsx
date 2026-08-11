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
          <p className="brand-subtitle">Markdown 轉 WordPress 快捷貼上 & Gutenberg 區塊轉換器</p>
        </div>
      </div>

      <div className="header-controls">
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
