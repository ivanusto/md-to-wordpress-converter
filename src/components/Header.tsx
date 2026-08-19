import React from 'react';
import {
  Upload,
  Download,
  RotateCcw,
  Sparkles,
  Settings,
  Globe,
  FileCode2,
  Languages,
  ShieldCheck,
} from 'lucide-react';
import type { ThemeStyle, AppLanguage } from '../types';
import { t } from '../utils/i18n';

interface HeaderProps {
  onLoadSample: () => void;
  onClear: () => void;
  onFileUpload: (file: File) => void;
  onDownload: () => void;
  onOpenSettings: () => void;
  onCleanAiMarks: () => void;
  themeStyle: ThemeStyle;
  onThemeStyleChange: (theme: ThemeStyle) => void;
  hasContent: boolean;
  lang: AppLanguage;
  onToggleLang: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  onClear,
  onFileUpload,
  onDownload,
  onOpenSettings,
  onCleanAiMarks,
  themeStyle,
  onThemeStyleChange,
  hasContent,
  lang,
  onToggleLang,
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
            {t('brand.title', lang)} <span className="badge-gutenberg">{t('brand.badge', lang)}</span>
          </h1>
          <p className="brand-subtitle">
            {t('brand.subtitle', lang)}
          </p>
        </div>
      </div>

      <div className="header-controls">
        <div className="header-external-links">
          <button
            onClick={onToggleLang}
            className="btn btn-secondary btn-sm link-btn"
            title="Switch Language / 切換語言"
            style={{ fontWeight: 600 }}
          >
            <Languages className="icon-sm text-indigo" />
            <span className="btn-label">{t('header.lang', lang)}</span>
          </button>
          <a
            href="https://yblog.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm link-btn btn-icon-only"
            title="yblog.org"
          >
            <Globe className="icon-sm text-blue" />
            <span className="sr-only">{t('header.yblog', lang)}</span>
          </a>
          <a
            href="https://github.com/ivanusto"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm link-btn btn-icon-only"
            title="Ivan Lin's GitHub"
          >
            <svg className="icon-sm" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span className="sr-only">{t('header.github', lang)}</span>
          </a>
        </div>

        <div className="theme-selector-wrapper">
          <span className="control-label">{t('header.themeStyle', lang)}</span>
          <select
            value={themeStyle}
            onChange={(e) => onThemeStyleChange(e.target.value as ThemeStyle)}
            className="select-theme"
          >
            <option value="wordpress">{t('theme.wordpress', lang)}</option>
            <option value="editorial">{t('theme.editorial', lang)}</option>
            <option value="dark">{t('theme.dark', lang)}</option>
            <option value="corporate">{t('theme.corporate', lang)}</option>
          </select>
        </div>

        <div className="action-buttons-group">
          <button
            onClick={onLoadSample}
            className="btn btn-secondary btn-sm"
            title={t('header.loadSample', lang)}
          >
            <Sparkles className="icon-sm text-amber" />
            <span className="btn-label">{t('header.loadSample', lang)}</span>
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
            title={t('header.import', lang)}
          >
            <Upload className="icon-sm" />
            <span className="btn-label">{t('header.import', lang)}</span>
          </button>

          {hasContent && (
            <>
              <button
                onClick={onCleanAiMarks}
                className="btn btn-secondary btn-sm"
                title={t('header.cleanAiBtn', lang)}
                style={{ color: '#10b981' }}
              >
                <ShieldCheck className="icon-sm" />
                <span className="btn-label">{t('header.cleanAiBtn', lang)}</span>
              </button>

              <button
                onClick={onDownload}
                className="btn btn-secondary btn-sm"
                title={t('header.download', lang)}
              >
                <Download className="icon-sm" />
                <span className="btn-label">{t('header.download', lang)}</span>
              </button>

              <button
                onClick={onClear}
                className="btn btn-ghost btn-sm text-red"
                title={t('header.clear', lang)}
              >
                <RotateCcw className="icon-sm" />
                <span className="btn-label">{t('header.clear', lang)}</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenSettings}
            className="btn btn-icon"
            title={t('header.settings', lang)}
          >
            <Settings className="icon-md" />
          </button>
        </div>
      </div>
    </header>
  );
};
