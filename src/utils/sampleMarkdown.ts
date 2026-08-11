export const SAMPLE_MARKDOWN = `---
title: "WordPress 文章排版指南：將 Markdown 無縫轉換為 Gutenberg 原生區塊"
slug: "wordpress-markdown-gutenberg-guide"
categories:
  - "技術教學"
  - "網站營運"
tags:
  - "WordPress"
  - "Markdown"
  - "Gutenberg"
  - "排版工具"
excerpt: "本文介紹如何輕鬆將寫好的 Markdown 文件轉換為 WordPress 可直接貼上的 Gutenberg 區塊與美觀 HTML 格式。"
date: "2026-08-11"
coverImage: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&auto=format&fit=crop"
author: "Ivan Chen"
---

# 為什麼選擇 Markdown 撰寫 WordPress 文章？

對於許多創作者與工程師來說，使用 **Markdown** 撰寫文章具有極高的效率。它讓你專注於文字創作，而不必頻繁切換滑鼠點擊排版按鈕。

然而，當我們要把寫好的 .md 檔案發布到 **WordPress** 時，經常會遇到以下痛點：

1. **格式錯亂**：直接貼上標題或表格時，字體大小或欄位邊框走樣。
2. **程式碼區塊無高亮**：程式碼變純文字，缺乏語法高亮 (Syntax Highlighting)。
3. **區塊無法辨識**：WordPress Gutenberg 無法自動將標題或引言辨識為原生區塊。

---

## 核心功能比較表

以下是透過本轉換工具與傳統方式複製貼上的差異比較：

| 功能項目 | 本工具轉換輸出 | 傳統純文字貼上 |
| :--- | :--- | :--- |
| **Gutenberg 區塊自動辨識** | 100% 原生 Block | 僅辨識基本段落 |
| **程式碼高亮 (Prism/Highlight)** | 支援 (語法高亮 + 複製按鈕) | 無高亮純文字 |
| **引言與提示框 (Callouts)** | 支援 4 種提示框與圖標 | 變普通縮排字 |
| **圖片與圖解說明 (Caption)** | 支援 figure 標籤與圖標 | 無法預覽或路徑遺失 |
| **表格樣式 (Responsive Table)** | 美觀邊框與交替背景色 | 普通無邊框表格 |

---

## 提示框 (Callout Boxes) 範例

> [!NOTE]
> **溫馨提示**：當你使用本工具的「複製並直接貼到 WordPress」按鈕時，剪貼簿會同時包含 text/html 與 text/plain 格式，在 WordPress 視覺化編輯器中按下 Ctrl + V 即可完美還原格式！

> [!WARNING]
> **注意事項**：若 Markdown 中包含本地圖片路徑（例如 ./images/photo.jpg），請先將圖片上傳至 WordPress 媒體庫，並在「圖片管理」頁籤中替換為線上 URL。

> [!TIP]
> **進階技巧**：也可以選擇「Gutenberg 區塊語法」模式，複製帶有 \`<!-- wp:paragraph -->\` 的程式碼貼入 WordPress 程式碼編輯器中！

---

## 程式碼高亮範例

### JavaScript / TypeScript 腳本

\`\`\`typescript
interface PostMetadata {
  title: string;
  tags: string[];
  views: number;
}

function generateGutenbergBlock(type: string, content: string): string {
  return \`<!-- wp:\${type} -->\\n\${content}\\n<!-- /wp:\${type} -->\`;
}

console.log(generateGutenbergBlock('paragraph', '<p>Hello WordPress!</p>'));
\`\`\`

### Python 自動發布腳本

\`\`\`python
import requests

def publish_to_wordpress(api_url, auth_token, post_data):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{api_url}/wp-json/wp/v2/posts", json=post_data, headers=headers)
    return response.json()
\`\`\`

---

## 文章圖片展示

![WordPress Gutenberg 編輯器展示](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&auto=format&fit=crop)

---

## 條目列表 (Lists)

### 本工具支援的轉換項目：
- [x] 自動解析 YAML 前言 (Frontmatter) 標題與標籤
- [x] 自動將 Markdown 轉換為 HTML 及 Gutenberg Block
- [x] 一鍵複製格式化內容貼入 WordPress
- [x] 圖片路徑自動檢測與批量替換
- [x] 4 種主題配色 style 切換

---

## 總結

使用這款轉換工具，讓你隨時享受 Markdown 創作的高效，同時輕鬆保有 WordPress 豐富美觀的排版成果！
`;
