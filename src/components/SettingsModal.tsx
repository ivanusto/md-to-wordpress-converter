import React from 'react';
import { X, Sliders, Check } from 'lucide-react';
import type { ConverterOptions, CodeTheme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ConverterOptions;
  onOptionsChange: (newOptions: ConverterOptions) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof ConverterOptions>(key: K, value: ConverterOptions[K]) => {
    onOptionsChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sliders className="icon-md text-primary" />
            <h3>轉換與排版進階設定</h3>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X className="icon-md" />
          </button>
        </div>

        <div className="modal-body">
          <div className="setting-group">
            <h4 className="setting-group-title">連結與標題屬性</h4>
            <label className="checkbox-setting">
              <input
                type="checkbox"
                checked={options.openLinksInNewTab}
                onChange={(e) => handleChange('openLinksInNewTab', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>外部連結於新分頁開啟 (target="_blank")</strong>
                <p>自動為包含 http/https 的連結加入 `target="_blank"` 及 `rel="noopener noreferrer"`</p>
              </div>
            </label>

            <label className="checkbox-setting">
              <input
                type="checkbox"
                checked={options.addHeadingIds}
                onChange={(e) => handleChange('addHeadingIds', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>標題自動生成 Slug ID (用於文章目錄 / 錨點)</strong>
                <p>在 `&lt;h2 id="slug"&gt;` 中加入 ID，利於 WordPress 目錄外掛導向錨點</p>
              </div>
            </label>
          </div>

          <div className="setting-group">
            <h4 className="setting-group-title">程式碼高亮主題 (Code Theme)</h4>
            <select
              value={options.codeTheme}
              onChange={(e) => handleChange('codeTheme', e.target.value as CodeTheme)}
              className="select-input"
            >
              <option value="vscode">VS Code Dark (預設暗色)</option>
              <option value="github">GitHub Light (經典明亮)</option>
              <option value="dracula">Dracula (炫彩紫暗色)</option>
              <option value="monokai">Monokai Pro (極客對比)</option>
              <option value="one-dark">Atom One Dark (深灰優雅)</option>
            </select>
          </div>

          <div className="setting-group">
            <h4 className="setting-group-title">預設圖片 URL 前綴</h4>
            <p className="setting-desc">自動為非完整 URL 的相對圖片加上前綴網址（選填）</p>
            <input
              type="url"
              placeholder="例如: https://example.com/wp-content/uploads/2026/"
              value={options.customImagePrefix}
              onChange={(e) => handleChange('customImagePrefix', e.target.value)}
              className="text-input"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            <Check className="icon-sm" />
            <span>儲存並關閉</span>
          </button>
        </div>
      </div>
    </div>
  );
};
