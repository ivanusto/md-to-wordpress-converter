# WP-Markdown Converter 🚀 (Markdown to WordPress & Gutenberg)

> **Markdown 轉 WordPress 快捷貼上 & Gutenberg 原生區塊轉換器 | Markdown to WordPress Instant Paste & Gutenberg Block Converter**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-emerald.svg)](https://ivanusto.github.io/md-to-wordpress-converter/)
[![Author](https://img.shields.io/badge/Author-ivanusto-indigo.svg)](https://github.com/ivanusto)
[![Blog](https://img.shields.io/badge/Blog-yblog.org-cyan.svg)](https://yblog.org)

An open-source, privacy-first, 100% client-side web application built with React, TypeScript, and Vite. Designed for WordPress bloggers, technical writers, and content creators to instantly convert Markdown drafts into native WordPress Gutenberg blocks, clean HTML, and formatted rich text with YAML Frontmatter extraction.

這是一款專為 WordPress 創作者、技術部落客與工程師打造的純前端開源 Markdown 轉換工具。支援 Frontmatter 元數據解析、Gutenberg 原生區塊語法生成、程式碼高亮、GitHub 風格提示框 (Callouts)、圖片連結替換與一鍵 Rich Text 複製貼上。

---

## ✨ Key Features / 核心特色

- 🚀 **Instant Rich Text Paste (一鍵直接貼上)**: Click "Copy for WordPress Direct Paste" and press `Ctrl + V` in WordPress Visual Editor to preserve headings, tables, callouts, and styling.
- 🧱 **Gutenberg Blocks Generator (原生 Gutenberg 區塊語法)**: Automatically generates `<!-- wp:paragraph -->`, `<!-- wp:heading -->`, `<!-- wp:code -->`, `<!-- wp:table -->` blocks.
- 📌 **YAML Frontmatter Parser (元數據解析)**: Extracts `title`, `slug`, `categories`, `tags`, `excerpt`, `date`, `author`, and `coverImage` with one-click copy buttons for WordPress post settings.
- 🖼️ **Local Image Path Inspector (圖片路徑檢測與替換)**: Detects local relative image paths (`./images/pic.png`) and provides a bulk replacement UI to map them to WordPress Media Library URLs.
- 💡 **GitHub-Flavored Callouts (提示框支援)**: Fully converts `> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`, and `> [!IMPORTANT]` blockquotes into beautifully styled Gutenberg callouts.
- 🌐 **Full Multilingual Support (繁體中文 / English i18n)**: Seamless language switcher with browser locale detection and persistence.
- 🎨 **4 Typographic Themes & 5 Code Themes**: WordPress Gutenberg, Editorial Serif, Tech Dark, Corporate Slate with VS Code, GitHub Light, Dracula, Monokai Pro, and Atom One Dark syntax highlighting.
- 🔒 **100% Privacy-First (純前端本地運算)**: Everything is processed in browser memory with zero server uploads or tracking.

---

## 🌐 Live Demo

- **Online Tool / 線上使用**: [https://ivanusto.github.io/md-to-wordpress-converter/](https://ivanusto.github.io/md-to-wordpress-converter/)
- **Author's Website / 部落格**: [https://yblog.org](https://yblog.org)
- **Author's GitHub**: [@ivanusto](https://github.com/ivanusto)

---

## 🛠️ Free Sister Web Tools / 更多免費實用線上工具

Check out these other free, privacy-first web tools / 歡迎體驗同系列純前端線上工具：
- 🛡️ **[AI Watermarks & Provenance Remover](https://ivanusto.github.io/watermarks-remover/)** — Strip multi-vendor AI provenance marks (ChatGPT, Claude, Gemini invisible Unicode, C2PA, EXIF metadata).
- 📐 **[Aspect Ratio & Crop Pro](https://ivanusto.github.io/image-aspect-ratio-calculator/)** — Smart image/video aspect ratio calculator, preset matcher, and real-time center-cropper.

---

## 🚀 Local Development / 本地開發

Built with React 19, TypeScript, and Vite.

```bash
# Clone the repository
git clone https://github.com/ivanusto/md-to-wordpress-converter.git
cd md-to-wordpress-converter

# Install dependencies
npm install

# Start local development server (http://localhost:5173)
npm run dev

# Build production bundle (output to ./dist)
npm run build
```

---

## 📜 License

This project is open-sourced under the [MIT License](LICENSE).
