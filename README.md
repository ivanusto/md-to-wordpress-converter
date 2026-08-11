# WP-Markdown Converter 🚀

> **Markdown 轉 WordPress 快捷貼上 & Gutenberg 區塊轉換器**

這是一款專為 WordPress 創作者、部落客與工程師打造的線上 Markdown 轉換工具。支援 Frontmatter 元數據解析、Gutenberg 原生區塊轉換、程式碼高亮、提示框 (Callouts) 與一鍵 Rich Text 複製貼上。

---

## 🌟 核心特色

- 🚀 **一鍵複製直接貼上**：按下「複製並直接貼到 WordPress」，即可在 WordPress 視覺化編輯器按 `Ctrl + V` 還原標題、表格與排版。
- 🧱 **Gutenberg 區塊語法生成**：自動產生 `<!-- wp:paragraph -->``<!-- wp:heading -->``<!-- wp:code -->` 等原生區塊註解。
- 📌 **YAML Frontmatter 元數據**：自動解析 `title`、`slug`、`categories`、`tags`、`excerpt`、`coverImage`，一鍵複製標籤與摘要。
- 🖼️ **圖片相對路徑檢測**：識別本地圖片路徑（`./images/pic.png`），提供批量替換為 WordPress 媒體庫 URL 的介面。
- 💡 **提示框支援 (Callouts)**：支援 `> [!NOTE]`、`> [!WARNING]`、`> [!TIP]`、`> [!IMPORTANT]` 等註解框。
- 🎨 **4 種主題與 5 種代碼高亮**：支援 WordPress Gutenberg、Editorial Serif、Tech Dark、Corporate Slate。

---

## 🛠️ 本地開發與部署指令

```bash
# 安裝套件
npm install

# 啟動本地開發伺服器 (http://localhost:5173)
npm run dev

# 編譯生產打包檔 (輸出至 ./dist)
npm run build

# 發布部署至 GitHub Pages
npm run deploy
```

---

## 🔗 相關連結與 Credits

- **作者 GitHub**: [Ivan Lin (@ivanusto)](https://github.com/ivanusto)
- **部落格**: [優格網](https://yblog.org/)
- **線上工具體驗**: [WP-Markdown Converter](https://ivanusto.github.io/md-to-wordpress-converter/)

---

## 📦 授權條款

MIT License

