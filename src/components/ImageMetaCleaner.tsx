import React, { useCallback, useRef, useState } from 'react';
import { ShieldCheck, Upload, Download, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import type { AppLanguage } from '../types';
import { t } from '../utils/i18n';
import { clean, inspect, SUPPORTED_IMAGE_EXTENSIONS } from '../utils/imageMeta';

interface CleanedImage {
  id: string;
  name: string;
  format: string;
  originalSize: number;
  cleanedSize: number;
  findings: string[];
  actions: string[];
  removedCount: number;
  url: string;
  downloadName: string;
  error?: string;
}

interface ImageMetaCleanerProps {
  lang: AppLanguage;
  onShowToast?: (msg: string) => void;
}

const fmtBytes = (n: number): string =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

const cleanedName = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)}.clean${name.slice(dot)}` : `${name}.clean`;
};

export const ImageMetaCleaner: React.FC<ImageMetaCleanerProps> = ({ lang, onShowToast }) => {
  const [results, setResults] = useState<CleanedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const processed: CleanedImage[] = [];
      for (const file of Array.from(files)) {
        const id = `img-clean-${seq.current++}`;
        const base = { id, name: file.name, originalSize: file.size };
        try {
          const data = new Uint8Array(await file.arrayBuffer());
          const report = inspect(data);
          if (report.format === 'unknown') {
            processed.push({
              ...base, format: 'unknown', cleanedSize: file.size, findings: [], actions: [],
              removedCount: 0, url: '', downloadName: '', error: t('imgclean.unsupported', lang),
            });
            continue;
          }
          const result = clean(data, { stripAllMetadata: true });
          // Copy into a fresh buffer: the result can be a view over the source.
          const blob = new Blob([new Uint8Array(result.data)], { type: file.type || 'application/octet-stream' });
          processed.push({
            ...base,
            format: report.format,
            cleanedSize: result.data.length,
            findings: report.findings,
            actions: result.actions,
            removedCount: result.actions.filter((a) => a.startsWith('drop')).length,
            url: URL.createObjectURL(blob),
            downloadName: cleanedName(file.name),
          });
        } catch (e) {
          processed.push({
            ...base, format: 'unknown', cleanedSize: file.size, findings: [], actions: [],
            removedCount: 0, url: '', downloadName: '', error: e instanceof Error ? e.message : String(e),
          });
        }
      }
      setResults((prev) => [...processed, ...prev]);
      const cleanedCount = processed.reduce((n, r) => n + r.removedCount, 0);
      if (onShowToast && processed.length) {
        onShowToast(
          cleanedCount > 0
            ? t('imgclean.toastCleaned', lang, { files: processed.length, n: cleanedCount })
            : t('imgclean.toastAlreadyClean', lang, { files: processed.length })
        );
      }
    },
    [lang, onShowToast]
  );

  const clearAll = () => {
    results.forEach((r) => r.url && URL.revokeObjectURL(r.url));
    setResults([]);
  };

  return (
    <div className="imgclean-section">
      <div className="imgclean-header">
        <ShieldCheck className="icon-sm text-primary" />
        <div>
          <strong>{t('imgclean.title', lang)}</strong>
          <p>{t('imgclean.desc', lang)}</p>
        </div>
      </div>

      <div
        className={`imgclean-dropzone ${isDragging ? 'dragging' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="icon-md text-muted" />
        <span>{t('imgclean.drop', lang)}</span>
        <small>{t('imgclean.formats', lang)}</small>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={SUPPORTED_IMAGE_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {results.length > 0 && (
        <>
          <div className="imgclean-results">
            {results.map((r) => (
              <div key={r.id} className={`imgclean-result ${r.error ? 'has-error' : ''}`}>
                <div className="imgclean-result-head">
                  {r.error ? (
                    <AlertTriangle className="icon-sm text-amber shrink-0" />
                  ) : (
                    <CheckCircle2 className="icon-sm text-green shrink-0" />
                  )}
                  <span className="imgclean-name" title={r.name}>
                    {r.name}
                  </span>
                  {!r.error && <span className="badge">{r.format.toUpperCase()}</span>}
                </div>

                {r.error ? (
                  <p className="imgclean-error">{r.error}</p>
                ) : (
                  <>
                    <p className="imgclean-size">
                      {fmtBytes(r.originalSize)} → {fmtBytes(r.cleanedSize)}
                      {' · '}
                      {r.removedCount > 0
                        ? t('imgclean.removed', lang, { n: r.removedCount })
                        : t('imgclean.alreadyClean', lang)}
                    </p>
                    {r.findings.length > 0 && (
                      <ul className="imgclean-findings">
                        {r.findings.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                    <a className="btn btn-secondary btn-sm" href={r.url} download={r.downloadName}>
                      <Download className="icon-xs" /> {t('imgclean.download', lang)}
                    </a>
                  </>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
            <X className="icon-xs" /> {t('imgclean.clearAll', lang)}
          </button>
        </>
      )}
    </div>
  );
};
