export type AppLanguage = 'zh-TW' | 'en';

export const I18N_STRINGS = {
  'zh-TW': {
    'brand.title': 'WP-Markdown',
    'brand.badge': 'Gutenberg Ready',
    'brand.subtitle': 'Markdown 轉 WordPress 快捷貼上 & Gutenberg 區塊轉換器',
    'header.yblog': '優格網',
    'header.github': 'GitHub',
    'header.themeStyle': '排版風格:',
    'header.loadSample': '載入範例',
    'header.import': '匯入 .md',
    'header.download': '下載',
    'header.clear': '清空',
    'header.settings': '轉換設定',
    'header.lang': '🌐 EN',
    
    // Theme options
    'theme.wordpress': 'WordPress Gutenberg (預設)',
    'theme.editorial': 'Editorial 質感排版 (Serif)',
    'theme.dark': 'Tech 暗色極客 (Dark)',
    'theme.corporate': 'Corporate 商務藍 (Slate)',

    // Editor
    'editor.title': 'Markdown 輸入區 (.md)',
    'editor.hint': '可包含 Frontmatter 元數據',
    'editor.placeholder': '在此貼上或輸入 Markdown 內容... (亦可直接將 .md 檔案拖曳至此處)',
    'editor.dropTitle': '放開滑鼠以載入 Markdown 檔案',
    'editor.dropHint': '支援 .md, .markdown, .txt 格式',
    'editor.lines': '行',
    'editor.words': '字',
    'editor.chars': '字元',
    'editor.readTime': '約 {n} 分鐘',
    'editor.headings': '個標題',
    'editor.codeBlocks': '個代碼塊',
    'editor.images': '張圖片',

    // Preview
    'preview.tabVisual': '視覺預覽 & 直接貼上',
    'preview.tabGutenberg': 'Gutenberg 區塊碼',
    'preview.tabHtml': 'HTML 碼',
    'preview.tabMetadata': '文章元數據',
    'preview.tabImages': '圖片管理',
    'preview.btnCopyVisual': '複製並直接貼入 WordPress',
    'preview.btnCopyGutenberg': '複製 Gutenberg 區塊碼',
    'preview.btnCopyHtml': '複製 HTML 原始碼',
    'preview.copied': '已複製！',
    'preview.empty': '請在左側輸入 Markdown 內容以檢視預覽',

    // Settings
    'settings.title': '轉換與排版進階設定',
    'settings.linkAttr': '連結與標題屬性',
    'settings.openLinksNewTab': '外部連結於新分頁開啟 (target="_blank")',
    'settings.openLinksNewTabDesc': '自動為包含 http/https 的連結加入 target="_blank" 及 rel="noopener noreferrer"',
    'settings.headingIds': '標題自動生成 Slug ID (用於文章目錄 / 錨點)',
    'settings.headingIdsDesc': '在 <h2 id="slug"> 中加入 ID，利於 WordPress 目錄外掛導向錨點',
    'settings.codeTheme': '程式碼高亮主題 (Code Theme)',
    'settings.imagePrefix': '預設圖片 URL 前綴',
    'settings.imagePrefixDesc': '自動為非完整 URL 的相對圖片加上前綴網址（選填）',
    'settings.save': '儲存並關閉',

    // Images
    'images.title': '🖼️ 文章圖片連結管理 ({n} 張圖片)',
    'images.desc': '管理與替換 Markdown 中的圖片網址，確保貼到 WordPress 時圖片能正常顯示。',
    'images.emptyTitle': '文件中未找到圖片',
    'images.emptyDesc': '當你在 Markdown 中寫入 `![說明文字](https://...)` 時，圖片將在此處列出。',
    'images.alertLocal': '檢測到 {n} 張本地相對路徑圖片！',
    'images.alertLocalDesc': '本地路徑（如 ./images/pic.png）在 WordPress 中無法直接讀取。請先將圖片上傳至 WordPress「媒體庫」，並在下方貼上媒體庫提供的線上網址進行替換。',
    'images.localBadge': '本地路徑',
    'images.remoteBadge': '線上網址',
    'images.alt': '說明 (Alt):',
    'images.noAlt': '無描述',
    'images.replacePrefix': '替換為 WP 媒體庫 URL:',
    'images.replacePlaceholder': '貼上上傳至 WordPress 媒體庫後的圖片完整網址 (https://...)',
    'images.localPlaceholder': '本地圖檔',

    // Metadata
    'meta.emptyTitle': '未檢測到 YAML 前言 (Frontmatter)',
    'meta.emptyDesc': '可在 Markdown 最頂部加入 Frontmatter 區塊：',
    'meta.bannerTitle': '📌 解析到的文章元數據 (Frontmatter)',
    'meta.bannerDesc': '你可以直接複製下方各個欄位貼入 WordPress 文章設定欄',
    'meta.titleLabel': '文章標題 (Title)',
    'meta.slugLabel': '網址 Slug / 固定連結',
    'meta.categoriesLabel': '分類 (Categories)',
    'meta.tagsLabel': '標籤 (Tags)',
    'meta.excerptLabel': '文章摘要 (Excerpt)',
    'meta.coverLabel': '🖼️ 特色圖片 (Featured / Cover Image)',
    'meta.dateLabel': '發布日期',
    'meta.authorLabel': '作者',
    'meta.copy': '複製',
    'meta.copied': '已複製',

    // Footer
    'footer.linkWm': '🛡️ AI 浮水印清除器',
    'footer.linkRatio': '📐 比例計算與裁切器',
    'footer.linkRepo': '🐙 GitHub 專案',
    'footer.linkBlog': '🌐 優格網',
    'footer.credits': 'WP-Markdown Converter © 2026 | 作者: Ivan Lin (@ivanusto) | 100% 瀏覽器端本地運算 · 隱私守護',

    // Toasts
    'toast.sampleLoaded': '已載入範例 Markdown 文章',
    'toast.cleared': '內容已清空',
    'toast.fileLoaded': '已成功讀取檔案: {name}',
    'toast.downloadSuccess': '檔案下載成功！',
    'toast.copiedVisual': '🚀 已成功複製格式化內容！請直接在 WordPress 視覺化編輯器按 Ctrl + V 貼上！',
    'toast.copiedGutenberg': '🧱 已複製 Gutenberg 區塊語法！可貼入 WordPress 程式碼編輯器中！',
    'toast.copiedHtml': '🏷️ 已複製 HTML 原生碼！',
  },
  'en': {
    'brand.title': 'WP-Markdown',
    'brand.badge': 'Gutenberg Ready',
    'brand.subtitle': 'Markdown to WordPress Instant Paste & Gutenberg Block Converter',
    'header.yblog': 'yblog.org',
    'header.github': 'GitHub',
    'header.themeStyle': 'Layout Theme:',
    'header.loadSample': 'Load Sample',
    'header.import': 'Import .md',
    'header.download': 'Download',
    'header.clear': 'Clear',
    'header.settings': 'Settings',
    'header.lang': '🌐 中文',
    
    // Theme options
    'theme.wordpress': 'WordPress Gutenberg (Default)',
    'theme.editorial': 'Editorial Serif (Elegant)',
    'theme.dark': 'Tech Geek (Dark)',
    'theme.corporate': 'Corporate Slate (Blue)',

    // Editor
    'editor.title': 'Markdown Input Area (.md)',
    'editor.hint': 'Supports Frontmatter Metadata',
    'editor.placeholder': 'Paste or type Markdown content here... (You can also drag and drop .md files directly)',
    'editor.dropTitle': 'Drop mouse to load Markdown file',
    'editor.dropHint': 'Supports .md, .markdown, .txt files',
    'editor.lines': 'lines',
    'editor.words': 'words',
    'editor.chars': 'chars',
    'editor.readTime': '~{n} min read',
    'editor.headings': 'headings',
    'editor.codeBlocks': 'code blocks',
    'editor.images': 'images',

    // Preview
    'preview.tabVisual': 'Visual Preview & Direct Paste',
    'preview.tabGutenberg': 'Gutenberg Blocks',
    'preview.tabHtml': 'HTML Code',
    'preview.tabMetadata': 'Article Metadata',
    'preview.tabImages': 'Image Manager',
    'preview.btnCopyVisual': 'Copy for WordPress Direct Paste',
    'preview.btnCopyGutenberg': 'Copy Gutenberg Blocks',
    'preview.btnCopyHtml': 'Copy HTML Source',
    'preview.copied': 'Copied!',
    'preview.empty': 'Please enter Markdown content on the left to see live preview',

    // Settings
    'settings.title': 'Advanced Conversion & Layout Settings',
    'settings.linkAttr': 'Links & Headings Attributes',
    'settings.openLinksNewTab': 'Open External Links in New Tab (target="_blank")',
    'settings.openLinksNewTabDesc': 'Automatically adds target="_blank" and rel="noopener noreferrer" to external http/https links',
    'settings.headingIds': 'Auto-generate Heading Slug IDs (for Table of Contents)',
    'settings.headingIdsDesc': 'Adds ID attributes to <h2 id="slug"> for WordPress TOC anchor plugins',
    'settings.codeTheme': 'Syntax Highlight Theme (Code Theme)',
    'settings.imagePrefix': 'Default Image URL Prefix',
    'settings.imagePrefixDesc': 'Prepends base URL prefix to relative image paths (Optional)',
    'settings.save': 'Save & Close',

    // Images
    'images.title': '🖼️ Article Image Management ({n} Images)',
    'images.desc': 'Manage and replace image URLs in Markdown to ensure images display properly in WordPress.',
    'images.emptyTitle': 'No Images Found in Document',
    'images.emptyDesc': 'When you include `![alt text](https://...)` in your Markdown, images will appear here.',
    'images.alertLocal': 'Detected {n} local relative image paths!',
    'images.alertLocalDesc': 'Local paths (e.g. ./images/pic.png) cannot be accessed directly in WordPress. Please upload images to WordPress Media Library first and paste the online URL below.',
    'images.localBadge': 'Local Path',
    'images.remoteBadge': 'Online URL',
    'images.alt': 'Alt Text:',
    'images.noAlt': 'No description',
    'images.replacePrefix': 'Replace with WP Media URL:',
    'images.replacePlaceholder': 'Paste full WordPress media library image URL (https://...)',
    'images.localPlaceholder': 'Local Image',

    // Metadata
    'meta.emptyTitle': 'No YAML Frontmatter Detected',
    'meta.emptyDesc': 'You can add a Frontmatter block at the very top of your Markdown:',
    'meta.bannerTitle': '📌 Extracted Article Metadata (Frontmatter)',
    'meta.bannerDesc': 'You can directly copy individual fields below into your WordPress post settings',
    'meta.titleLabel': 'Post Title',
    'meta.slugLabel': 'URL Slug / Permalink',
    'meta.categoriesLabel': 'Categories',
    'meta.tagsLabel': 'Tags',
    'meta.excerptLabel': 'Post Excerpt',
    'meta.coverLabel': '🖼️ Featured / Cover Image',
    'meta.dateLabel': 'Publish Date',
    'meta.authorLabel': 'Author',
    'meta.copy': 'Copy',
    'meta.copied': 'Copied',

    // Footer
    'footer.linkWm': '🛡️ AI Watermarks Remover',
    'footer.linkRatio': '📐 Aspect Ratio & Crop Pro',
    'footer.linkRepo': '🐙 GitHub Repo',
    'footer.linkBlog': '🌐 yblog.org',
    'footer.credits': 'WP-Markdown Converter © 2026 | Developed by Ivan Lin (@ivanusto) | 100% Client-Side In-Browser • Privacy-First',

    // Toasts
    'toast.sampleLoaded': 'Loaded sample Markdown article',
    'toast.cleared': 'Content cleared',
    'toast.fileLoaded': 'Successfully loaded file: {name}',
    'toast.downloadSuccess': 'File downloaded successfully!',
    'toast.copiedVisual': '🚀 Formatted content copied! Press Ctrl + V directly inside WordPress Visual Editor!',
    'toast.copiedGutenberg': '🧱 Gutenberg block code copied! Paste into WordPress Code Editor!',
    'toast.copiedHtml': '🏷️ HTML source code copied!',
  }
};

export function t(key: string, lang: AppLanguage, params?: Record<string, string | number>): string {
  const dict = I18N_STRINGS[lang] || I18N_STRINGS['en'];
  let str = (dict as Record<string, string>)[key] || (I18N_STRINGS['en'] as Record<string, string>)[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}
