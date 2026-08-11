import React, { useState } from 'react';
import { FileText, FileUp, Hash, Clock, Code, Image as ImageIcon, AlignLeft } from 'lucide-react';
import type { MarkdownStats } from '../types';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFileUpload: (file: File) => void;
  stats: MarkdownStats;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  onFileUpload,
  stats,
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
          <h3>放開滑鼠以載入 Markdown 檔案</h3>
          <p>支援 .md, .markdown, .txt 格式</p>
        </div>
      )}

      <div className="editor-header">
        <div className="editor-title">
          <FileText className="icon-sm text-primary" />
          <span>Markdown 輸入區 (.md)</span>
        </div>
        <div className="editor-quick-hint">
          <span>可包含 Frontmatter 元數據</span>
        </div>
      </div>

      <div className="editor-body">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="在此貼上或輸入 Markdown 內容... (亦可直接將 .md 檔案拖曳至此處)"
          className="editor-textarea"
          spellCheck={false}
        />
      </div>

      <div className="editor-footer">
        <div className="stat-item" title="總行數">
          <AlignLeft className="icon-xs" />
          <span>{lineCount} 行</span>
        </div>
        <div className="stat-item" title="總字數">
          <Hash className="icon-xs" />
          <span>{stats.wordCount} 字 / {stats.charCount} 字元</span>
        </div>
        <div className="stat-item" title="預估閱讀時間">
          <Clock className="icon-xs" />
          <span>約 {stats.readTimeMinutes} 分鐘</span>
        </div>
        <div className="stat-item hidden-mobile" title="標題數量">
          <span className="stat-label">H</span>
          <span>{stats.headingCount} 個標題</span>
        </div>
        <div className="stat-item hidden-mobile" title="程式碼區塊">
          <Code className="icon-xs" />
          <span>{stats.codeBlockCount} 個代碼塊</span>
        </div>
        <div className="stat-item hidden-mobile" title="圖片數量">
          <ImageIcon className="icon-xs" />
          <span>{stats.imageCount} 張圖片</span>
        </div>
      </div>
    </div>
  );
};
