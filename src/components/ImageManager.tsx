import React from 'react';
import { Image as ImageIcon, AlertTriangle, CheckCircle2, Link2, ArrowRight } from 'lucide-react';
import type { ExtractedImage } from '../types';

interface ImageManagerProps {
  images: ExtractedImage[];
  imageReplacements: Record<string, string>;
  onUpdateReplacement: (originalUrl: string, newUrl: string) => void;
}

export const ImageManager: React.FC<ImageManagerProps> = ({
  images,
  imageReplacements,
  onUpdateReplacement,
}) => {
  if (images.length === 0) {
    return (
      <div className="empty-state">
        <ImageIcon className="icon-xl text-muted" />
        <h3>文件中未找到圖片</h3>
        <p>當你在 Markdown 中寫入 `![說明文字](https://...)` 時，圖片將在此處列出。</p>
      </div>
    );
  }

  const localImagesCount = images.filter((img) => img.isLocal).length;

  return (
    <div className="image-manager-container">
      <div className="image-manager-header">
        <div className="title-group">
          <h4>🖼️ 文章圖片連結管理 ({images.length} 張圖片)</h4>
          <p>管理與替換 Markdown 中的圖片網址，確保貼到 WordPress 時圖片能正常顯示。</p>
        </div>
      </div>

      {localImagesCount > 0 && (
        <div className="alert-banner alert-warning">
          <AlertTriangle className="icon-md text-amber shrink-0" />
          <div>
            <strong>檢測到 {localImagesCount} 張本地相對路徑圖片！</strong>
            <p>
              本地路徑（如 `./images/pic.png`）在 WordPress 中無法直接讀取。請先將圖片上傳至 WordPress
              「媒體庫」，並在下方貼上媒體庫提供的線上網址進行替換。
            </p>
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
                    <span className="badge badge-warning" title="本地相對路徑">
                      <AlertTriangle className="icon-xs" /> 本地路徑
                    </span>
                  ) : (
                    <span className="badge badge-success" title="線上 HTTP/HTTPS 網址">
                      <CheckCircle2 className="icon-xs" /> 線上網址
                    </span>
                  )}
                </div>

                <div className="image-details-col">
                  <div className="image-alt">
                    <strong>說明 (Alt):</strong> {img.altText || '無描述'}
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
                      <span>替換為 WP 媒體庫 URL:</span>
                    </div>
                    <input
                      type="url"
                      placeholder="貼上上傳至 WordPress 媒體庫後的圖片完整網址 (https://...)"
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
                      <span>本地圖檔</span>
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
