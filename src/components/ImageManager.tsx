import React from 'react';
import { Image as ImageIcon, AlertTriangle, CheckCircle2, Link2, ArrowRight } from 'lucide-react';
import type { ExtractedImage, AppLanguage } from '../types';
import { t } from '../utils/i18n';

interface ImageManagerProps {
  images: ExtractedImage[];
  imageReplacements: Record<string, string>;
  onUpdateReplacement: (originalUrl: string, newUrl: string) => void;
  lang: AppLanguage;
}

export const ImageManager: React.FC<ImageManagerProps> = ({
  images,
  imageReplacements,
  onUpdateReplacement,
  lang,
}) => {
  if (images.length === 0) {
    return (
      <div className="empty-state">
        <ImageIcon className="icon-xl text-muted" />
        <h3>{t('images.emptyTitle', lang)}</h3>
        <p>{t('images.emptyDesc', lang)}</p>
      </div>
    );
  }

  const localImagesCount = images.filter((img) => img.isLocal).length;

  return (
    <div className="image-manager-container">
      <div className="image-manager-header">
        <div className="title-group">
          <h4>{t('images.title', lang, { n: images.length })}</h4>
          <p>{t('images.desc', lang)}</p>
        </div>
      </div>

      {localImagesCount > 0 && (
        <div className="alert-banner alert-warning">
          <AlertTriangle className="icon-md text-amber shrink-0" />
          <div>
            <strong>{t('images.alertLocal', lang, { n: localImagesCount })}</strong>
            <p>{t('images.alertLocalDesc', lang)}</p>
          </div>
        </div>
      )}

      <div className="image-list">
        {images.map((img, idx) => {
          const currentReplacement = imageReplacements[img.originalUrl] || '';
          const isReplaced = Boolean(currentReplacement && currentReplacement !== img.originalUrl);

          return (
            <div key={img.id || idx} className={`image-card ${img.isLocal && !isReplaced ? 'warning-border' : ''}`}>
              <div className="image-card-main">
                <div className="image-badge-col">
                  <span className="image-index">#{idx + 1}</span>
                  {img.isLocal ? (
                    <span className="badge badge-warning" title="Local path">
                      <AlertTriangle className="icon-xs" /> {t('images.localBadge', lang)}
                    </span>
                  ) : (
                    <span className="badge badge-success" title="Online URL">
                      <CheckCircle2 className="icon-xs" /> {t('images.remoteBadge', lang)}
                    </span>
                  )}
                </div>

                <div className="image-details-col">
                  <div className="image-alt">
                    <strong>{t('images.alt', lang)}</strong> {img.altText || t('images.noAlt', lang)}
                  </div>
                  <div className="image-original-url">
                    <Link2 className="icon-xs text-muted shrink-0" />
                    <span className="url-text" title={img.originalUrl}>
                      {img.originalUrl}
                    </span>
                  </div>

                  <div className="image-replacement-box">
                    <div className="input-prefix">
                      <ArrowRight className="icon-xs text-primary" />
                      <span>{t('images.replacePrefix', lang)}</span>
                    </div>
                    <input
                      type="url"
                      placeholder={t('images.replacePlaceholder', lang)}
                      value={currentReplacement}
                      onChange={(e) => onUpdateReplacement(img.originalUrl, e.target.value)}
                      className="input-replacement"
                    />
                  </div>
                </div>

                <div className="image-preview-thumb">
                  {!img.isLocal || isReplaced ? (
                    <img
                      src={isReplaced ? currentReplacement : img.originalUrl}
                      alt={img.altText}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                      }}
                    />
                  ) : (
                    <div className="local-img-placeholder">
                      <span>{t('images.localPlaceholder', lang)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
