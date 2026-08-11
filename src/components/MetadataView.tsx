import React from 'react';
import { Tag, Folder, Calendar, User, Link, FileText, Copy, Check } from 'lucide-react';
import type { FrontmatterData } from '../types';
import { copyPlainTextToClipboard } from '../utils/clipboardHelper';

interface MetadataViewProps {
  frontmatter: FrontmatterData;
  onCopiedToast: (msg: string) => void;
}

export const MetadataView: React.FC<MetadataViewProps> = ({ frontmatter, onCopiedToast }) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const handleCopy = async (fieldKey: string, textToCopy: string, label: string) => {
    const success = await copyPlainTextToClipboard(textToCopy);
    if (success) {
      setCopiedField(fieldKey);
      onCopiedToast(`已複製${label}！`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const hasMetadata = Object.keys(frontmatter).length > 0;

  if (!hasMetadata) {
    return (
      <div className="empty-state">
        <FileText className="icon-xl text-muted" />
        <h3>未檢測到 YAML 前言 (Frontmatter)</h3>
        <p>可在 Markdown 最頂部加入以下 Frontmatter 區塊：</p>
        <pre className="code-example">
{`---
title: "我的文章標題"
slug: "my-post-slug"
categories: ["技術教學"]
tags: ["WordPress", "Markdown"]
excerpt: "文章簡短摘要..."
coverImage: "https://example.com/cover.jpg"
---`}
        </pre>
      </div>
    );
  }

  const tagsString = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.join(', ')
    : frontmatter.tags || '';

  const categoriesString = Array.isArray(frontmatter.categories)
    ? frontmatter.categories.join(', ')
    : frontmatter.categories || '';

  return (
    <div className="metadata-container">
      <div className="metadata-banner">
        <h4>📌 解析到的文章元數據 (Frontmatter)</h4>
        <p>你可以直接複製下方各個欄位貼入 WordPress 文章設定欄</p>
      </div>

      <div className="metadata-grid">
        {frontmatter.title && (
          <div className="metadata-card full-width">
            <div className="metadata-card-header">
              <span className="metadata-label">
                <FileText className="icon-xs" /> 文章標題 (Title)
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('title', frontmatter.title!, '文章標題')}
              >
                {copiedField === 'title' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'title' ? '已複製' : '複製標題'}</span>
              </button>
            </div>
            <div className="metadata-value title-value">{frontmatter.title}</div>
          </div>
        )}

        {frontmatter.slug && (
          <div className="metadata-card">
            <div className="metadata-card-header">
              <span className="metadata-label">
                <Link className="icon-xs" /> 網址 Slug / 固定連結
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('slug', frontmatter.slug!, 'Slug')}
              >
                {copiedField === 'slug' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'slug' ? '已複製' : '複製 Slug'}</span>
              </button>
            </div>
            <div className="metadata-value code-font">{frontmatter.slug}</div>
          </div>
        )}

        {categoriesString && (
          <div className="metadata-card">
            <div className="metadata-card-header">
              <span className="metadata-label">
                <Folder className="icon-xs" /> 分類 (Categories)
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('categories', categoriesString, '分類')}
              >
                {copiedField === 'categories' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'categories' ? '已複製' : '複製分類'}</span>
              </button>
            </div>
            <div className="metadata-tags">
              {Array.isArray(frontmatter.categories)
                ? frontmatter.categories.map((cat, i) => (
                    <span key={i} className="chip chip-category">
                      {cat}
                    </span>
                  ))
                : categoriesString}
            </div>
          </div>
        )}

        {tagsString && (
          <div className="metadata-card full-width">
            <div className="metadata-card-header">
              <span className="metadata-label">
                <Tag className="icon-xs" /> 標籤 (Tags)
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('tags', tagsString, '標籤')}
              >
                {copiedField === 'tags' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'tags' ? '已複製' : '複製標籤 (逗號分隔)'}</span>
              </button>
            </div>
            <div className="metadata-tags">
              {Array.isArray(frontmatter.tags)
                ? frontmatter.tags.map((tag, i) => (
                    <span key={i} className="chip chip-tag">
                      #{tag}
                    </span>
                  ))
                : tagsString}
            </div>
          </div>
        )}

        {frontmatter.excerpt && (
          <div className="metadata-card full-width">
            <div className="metadata-card-header">
              <span className="metadata-label">
                <FileText className="icon-xs" /> 文章摘要 (Excerpt)
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('excerpt', frontmatter.excerpt!, '摘要')}
              >
                {copiedField === 'excerpt' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'excerpt' ? '已複製' : '複製摘要'}</span>
              </button>
            </div>
            <div className="metadata-value excerpt-value">{frontmatter.excerpt}</div>
          </div>
        )}

        {frontmatter.coverImage && (
          <div className="metadata-card full-width">
            <div className="metadata-card-header">
              <span className="metadata-label">🖼️ 特色圖片 (Featured / Cover Image)</span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('cover', frontmatter.coverImage!, '封面圖片網址')}
              >
                {copiedField === 'cover' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'cover' ? '已複製' : '複製圖片網址'}</span>
              </button>
            </div>
            <div className="metadata-cover-preview">
              <img src={frontmatter.coverImage} alt="Cover Preview" className="cover-img" />
              <span className="cover-url">{frontmatter.coverImage}</span>
            </div>
          </div>
        )}

        {(frontmatter.date || frontmatter.author) && (
          <div className="metadata-card full-width grid-2-col">
            {frontmatter.date && (
              <div>
                <span className="metadata-label">
                  <Calendar className="icon-xs" /> 發布日期
                </span>
                <div className="metadata-value">{frontmatter.date}</div>
              </div>
            )}
            {frontmatter.author && (
              <div>
                <span className="metadata-label">
                  <User className="icon-xs" /> 作者
                </span>
                <div className="metadata-value">{frontmatter.author}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
