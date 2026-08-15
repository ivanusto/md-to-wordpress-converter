import React, { useState } from 'react';
import { FileText, FileUp, Hash, Clock, Code, Image as ImageIcon, AlignLeft, ShieldCheck } from 'lucide-react';
import type { MarkdownStats, AppLanguage } from '../types';
import { t } from '../utils/i18n';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFileUpload: (file: File) => void;
  stats: MarkdownStats;
  lang: AppLanguage;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  onFileUpload,
  stats,
  lang,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt'))) {
      onFileUpload(file);
    }
  };

  const lineCount = value ? value.split(/\r?\n/).length : 0;

  return (
    <div
      className={`editor-container ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <FileUp className="icon-xl text-primary animate-bounce" />
          <h3>{t('editor.dropTitle', lang)}</h3>
          <p>{t('editor.dropHint', lang)}</p>
        </div>
      )}

      <div className="editor-header">
        <div className="editor-title">
          <FileText className="icon-sm text-primary" />
          <span>{t('editor.title', lang)}</span>
        </div>
        <div className="editor-quick-hint">
          {stats.cleanedAiMarksCount > 0 ? (
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <ShieldCheck className="icon-xs" />
              <span>{t('editor.aiCleanBadge', lang, { n: stats.cleanedAiMarksCount })}</span>
            </span>
          ) : (
            <span>{t('editor.hint', lang)}</span>
          )}
        </div>
      </div>

      <div className="editor-body">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('editor.placeholder', lang)}
          className="editor-textarea"
          spellCheck={false}
        />
      </div>

      <div className="editor-footer">
        <div className="stat-item" title="Lines">
          <AlignLeft className="icon-xs" />
          <span>{lineCount} {t('editor.lines', lang)}</span>
        </div>
        <div className="stat-item" title="Words / Chars">
          <Hash className="icon-xs" />
          <span>{stats.wordCount} {t('editor.words', lang)} / {stats.charCount} {t('editor.chars', lang)}</span>
        </div>
        <div className="stat-item" title="Estimated Reading Time">
          <Clock className="icon-xs" />
          <span>{t('editor.readTime', lang, { n: stats.readTimeMinutes })}</span>
        </div>
        {stats.cleanedAiMarksCount > 0 && (
          <div className="stat-item" title="AI Invisible Watermark Removed" style={{ color: '#10b981', fontWeight: 600 }}>
            <ShieldCheck className="icon-xs" />
            <span>{t('editor.aiCleanBadge', lang, { n: stats.cleanedAiMarksCount })}</span>
          </div>
        )}
        <div className="stat-item hidden-mobile" title="Headings Count">
          <span className="stat-label">H</span>
          <span>{stats.headingCount} {t('editor.headings', lang)}</span>
        </div>
        <div className="stat-item hidden-mobile" title="Code Blocks Count">
          <Code className="icon-xs" />
          <span>{stats.codeBlockCount} {t('editor.codeBlocks', lang)}</span>
        </div>
        <div className="stat-item hidden-mobile" title="Images Count">
          <ImageIcon className="icon-xs" />
          <span>{stats.imageCount} {t('editor.images', lang)}</span>
        </div>
      </div>
    </div>
  );
};
