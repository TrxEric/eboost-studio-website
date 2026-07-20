# E Boost Studio Website

E Boost Studio 艾佳車藝官方網站，採用純靜態 HTML、CSS、JavaScript 架構，可部署到 GitHub Pages。

## 主要檔案

- `index.html`：網站首頁
- `styles.css`：全站共用樣式
- `wrap-simulator.html`：車身貼膜顏色模擬器
- `wrap-simulator.css`：模擬器專用樣式
- `wrap-simulator.js`：圖片上傳、遮罩、顏色合成與下載功能
- `data/wrap-colors.js`：貼膜色卡資料
- `assets/site-photos/`：網站公開圖片

## 本機測試

可直接用瀏覽器開啟：

```text
index.html
wrap-simulator.html
```

若要測試網站連結路徑，也可以用本機靜態伺服器開啟專案資料夾。

## 部署

GitHub Pages 上傳版位於：

```text
outputs/github-final-upload
```

上傳時請把該資料夾內的檔案放到 GitHub repository 根目錄。

## 車身貼膜顏色模擬器

第一階段為純前端版本，使用 Canvas 進行：

- 車輛照片上傳
- 色卡切換
- 點選車身烤漆位置重新取樣
- 前後對比
- JPG 圖片下載

目前遮罩為前端取樣估算，之後可接入更精準的車輛語意分割模型或後端 API。API key 不應寫在前端。

## AI 精修架構

商業版方向採用：

```text
GitHub Pages 前端 -> Cloudflare Worker -> AI Image API
```

前端公開設定：

- `data/ai-config.js`
- 僅放 Worker endpoint，不放 API key

後端範本：

- `worker/ai-wrap-preview-worker.js`

環境變數範例：

- `.env.example`

正式部署時，請把 `OPENAI_API_KEY` 設為 Cloudflare Worker secret，不要寫入任何前端檔案或 GitHub Pages 公開檔案。
