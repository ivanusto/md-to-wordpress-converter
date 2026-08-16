import React from 'react';
import { X, Sliders, Check, ShieldCheck } from 'lucide-react';
import type { ConverterOptions, CodeTheme, AppLanguage } from '../types';
import { t } from '../utils/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ConverterOptions;
  onOptionsChange: (newOptions: ConverterOptions) => void;
  lang: AppLanguage;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  lang,
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
            <h3>{t('settings.title', lang)}</h3>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X className="icon-md" />
          </button>
        </div>

        <div className="modal-body">
          {/* AI Invisible Watermark Stripper Group */}
          <div className="setting-group" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <h4 className="setting-group-title" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck className="icon-sm" />
              <span>{t('settings.aiSection', lang)}</span>
            </h4>
            <label className="checkbox-setting">
              <input
                type="checkbox"
                checked={options.autoCleanAiWatermarks}
                onChange={(e) => handleChange('autoCleanAiWatermarks', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>{t('settings.autoCleanAi', lang)}</strong>
                <p>{t('settings.autoCleanAiDesc', lang)}</p>
              </div>
            </label>

            <label className="checkbox-setting" style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={options.normalizeSpaceHomoglyphs}
                onChange={(e) => handleChange('normalizeSpaceHomoglyphs', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>{t('settings.normalizeSpaces', lang)}</strong>
                <p>{t('settings.normalizeSpacesDesc', lang)}</p>
              </div>
            </label>

            <label className="checkbox-setting" style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={options.replaceLatinConfusables}
                onChange={(e) => handleChange('replaceLatinConfusables', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>{t('settings.latinConfusables', lang)}</strong>
                <p>{t('settings.latinConfusablesDesc', lang)}</p>
              </div>
            </label>

            <label className="checkbox-setting" style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={options.nfkcNormalize}
                onChange={(e) => handleChange('nfkcNormalize', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>{t('settings.nfkc', lang)}</strong>
                <p>{t('settings.nfkcDesc', lang)}</p>
              </div>
            </label>

            <label className="checkbox-setting" style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={options.stripPrivateUseChars}
                onChange={(e) => handleChange('stripPrivateUseChars', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>{t('settings.stripPrivateUse', lang)}</strong>
                <p>{t('settings.stripPrivateUseDesc', lang)}</p>
              </div>
            </label>

            <label className="checkbox-setting" style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={options.stripEmojiGlue}
                onChange={(e) => handleChange('stripEmojiGlue', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>{t('settings.stripEmojiGlue', lang)}</strong>
                <p>{t('settings.stripEmojiGlueDesc', lang)}</p>
              </div>
            </label>

            <label className="checkbox-setting" style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={options.stripBidiMarks}
                onChange={(e) => handleChange('stripBidiMarks', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>{t('settings.stripBidi', lang)}</strong>
                <p>{t('settings.stripBidiDesc', lang)}</p>
              </div>
            </label>
          </div>

          <div className="setting-group">
            <h4 className="setting-group-title">{t('settings.linkAttr', lang)}</h4>
            <label className="checkbox-setting">
              <input
                type="checkbox"
                checked={options.openLinksInNewTab}
                onChange={(e) => handleChange('openLinksInNewTab', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>{t('settings.openLinksNewTab', lang)}</strong>
                <p>{t('settings.openLinksNewTabDesc', lang)}</p>
              </div>
            </label>

            <label className="checkbox-setting">
              <input
                type="checkbox"
                checked={options.addHeadingIds}
                onChange={(e) => handleChange('addHeadingIds', e.target.checked)}
              />
              <div className="checkbox-label-text">
                <strong>{t('settings.headingIds', lang)}</strong>
                <p>{t('settings.headingIdsDesc', lang)}</p>
              </div>
            </label>
          </div>

          <div className="setting-group">
            <h4 className="setting-group-title">{t('settings.codeTheme', lang)}</h4>
            <select
              value={options.codeTheme}
              onChange={(e) => handleChange('codeTheme', e.target.value as CodeTheme)}
              className="select-input"
            >
              <option value="vscode">VS Code Dark</option>
              <option value="github">GitHub Light</option>
              <option value="dracula">Dracula</option>
              <option value="monokai">Monokai Pro</option>
              <option value="one-dark">Atom One Dark</option>
            </select>
          </div>

          <div className="setting-group">
            <h4 className="setting-group-title">{t('settings.imagePrefix', lang)}</h4>
            <p className="setting-desc">{t('settings.imagePrefixDesc', lang)}</p>
            <input
              type="url"
              placeholder="e.g.: https://example.com/wp-content/uploads/2026/"
              value={options.customImagePrefix}
              onChange={(e) => handleChange('customImagePrefix', e.target.value)}
              className="text-input"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            <Check className="icon-sm" />
            <span>{t('settings.save', lang)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
