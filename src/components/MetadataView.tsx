import React from 'react';
import { Tag, Folder, Calendar, User, Link, FileText, Copy, Check } from 'lucide-react';
import type { FrontmatterData, AppLanguage } from '../types';
import { copyPlainTextToClipboard } from '../utils/clipboardHelper';
import { t } from '../utils/i18n';

interface MetadataViewProps {
  frontmatter: FrontmatterData;
  onCopiedToast: (msg: string) => void;
  lang: AppLanguage;
}

export const MetadataView: React.FC<MetadataViewProps> = ({ frontmatter, onCopiedToast, lang }) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const handleCopy = async (fieldKey: string, textToCopy: string, label: string) => {
    const success = await copyPlainTextToClipboard(textToCopy);
    if (success) {
      setCopiedField(fieldKey);
      onCopiedToast(`${t('meta.copied', lang)}: ${label}`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const hasMetadata = Object.keys(frontmatter).length > 0;

  if (!hasMetadata) {
    return (
      <div className="empty-state">
        <FileText className="icon-xl text-muted" />
        <h3>{t('meta.emptyTitle', lang)}</h3>
        <p>{t('meta.emptyDesc', lang)}</p>
        <pre className="code-example">
{`---
title: "My Article Title"
slug: "my-post-slug"
categories: ["Tech", "Tutorial"]
tags: ["WordPress", "Markdown"]
excerpt: "Short article excerpt..."
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
        <h4>{t('meta.bannerTitle', lang)}</h4>
        <p>{t('meta.bannerDesc', lang)}</p>
      </div>

      <div className="metadata-grid">
        {frontmatter.title && (
          <div className="metadata-card full-width">
            <div className="metadata-card-header">
              <span className="metadata-label">
                <FileText className="icon-xs" /> {t('meta.titleLabel', lang)}
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('title', frontmatter.title!, t('meta.titleLabel', lang))}
              >
                {copiedField === 'title' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'title' ? t('meta.copied', lang) : `${t('meta.copy', lang)} ${t('meta.titleLabel', lang)}`}</span>
              </button>
            </div>
            <div className="metadata-value title-value">{frontmatter.title}</div>
          </div>
        )}

        {frontmatter.slug && (
          <div className="metadata-card">
            <div className="metadata-card-header">
              <span className="metadata-label">
                <Link className="icon-xs" /> {t('meta.slugLabel', lang)}
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('slug', frontmatter.slug!, t('meta.slugLabel', lang))}
              >
                {copiedField === 'slug' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'slug' ? t('meta.copied', lang) : `${t('meta.copy', lang)} ${t('meta.slugLabel', lang)}`}</span>
              </button>
            </div>
            <div className="metadata-value code-font">{frontmatter.slug}</div>
          </div>
        )}

        {categoriesString && (
          <div className="metadata-card">
            <div className="metadata-card-header">
              <span className="metadata-label">
                <Folder className="icon-xs" /> {t('meta.categoriesLabel', lang)}
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('categories', categoriesString, t('meta.categoriesLabel', lang))}
              >
                {copiedField === 'categories' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'categories' ? t('meta.copied', lang) : `${t('meta.copy', lang)} ${t('meta.categoriesLabel', lang)}`}</span>
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
                <Tag className="icon-xs" /> {t('meta.tagsLabel', lang)}
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('tags', tagsString, t('meta.tagsLabel', lang))}
              >
                {copiedField === 'tags' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'tags' ? t('meta.copied', lang) : `${t('meta.copy', lang)} ${t('meta.tagsLabel', lang)}`}</span>
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
                <FileText className="icon-xs" /> {t('meta.excerptLabel', lang)}
              </span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('excerpt', frontmatter.excerpt!, t('meta.excerptLabel', lang))}
              >
                {copiedField === 'excerpt' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'excerpt' ? t('meta.copied', lang) : `${t('meta.copy', lang)} ${t('meta.excerptLabel', lang)}`}</span>
              </button>
            </div>
            <div className="metadata-value excerpt-value">{frontmatter.excerpt}</div>
          </div>
        )}

        {frontmatter.coverImage && (
          <div className="metadata-card full-width">
            <div className="metadata-card-header">
              <span className="metadata-label">{t('meta.coverLabel', lang)}</span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleCopy('cover', frontmatter.coverImage!, t('meta.coverLabel', lang))}
              >
                {copiedField === 'cover' ? <Check className="icon-xs text-green" /> : <Copy className="icon-xs" />}
                <span>{copiedField === 'cover' ? t('meta.copied', lang) : t('meta.copy', lang)}</span>
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
                  <Calendar className="icon-xs" /> {t('meta.dateLabel', lang)}
                </span>
                <div className="metadata-value">{frontmatter.date}</div>
              </div>
            )}
            {frontmatter.author && (
              <div>
                <span className="metadata-label">
                  <User className="icon-xs" /> {t('meta.authorLabel', lang)}
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
