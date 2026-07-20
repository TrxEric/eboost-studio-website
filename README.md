# E Boost Studio Website

E Boost Studio 艾佳車藝官方網站，採用純靜態 HTML、CSS、JavaScript 架構，可部署到 GitHub Pages。

## 主要檔案

- `index.html`：Tesla 新車防護導向首頁
- `tesla-quote.html`：Tesla 施工詢價頁
- `tesla-quote.js`：詢價頁欄位、送出流程與 Google 表單串接
- `other-vehicles.html`：其他車款施工與整車升級頁
- `tracking.js`：LINE、電話、預約與表單事件追蹤
- `shared-site.js`：把公司共用資料自動套用到各頁
- `data/site-config.js`：公司基本資料、版本號與主要維護準則
- `data/analytics-config.js`：Cloudflare Web Analytics token 設定
- `data/tesla-site-data.js`：Tesla 方案、FAQ 與表單選項
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
tesla-quote.html
other-vehicles.html
wrap-simulator.html
```

若要測試網站連結路徑，也可以用本機靜態伺服器開啟專案資料夾。

## 共用資料維護規則

公司基本資料只改這一個檔案：

```text
data/site-config.js
```

目前集中管理：

- 公司名稱
- 品牌定位
- 地址
- 電話
- LINE
- Facebook
- Instagram
- TikTok
- 網站版本號
- 主要維護準則

HTML 頁面不要再手動寫電話、LINE、地址與版本號。需要顯示文字時使用：

```html
<span data-site-text="address"></span>
```

需要連結時使用：

```html
<a href="#" data-site-link="phone">電話聯絡</a>
<a href="#" data-site-link="line">LINE 諮詢</a>
```

`shared-site.js` 會自動把資料套上去。

## 部署

GitHub Pages 上傳版位於：

```text
outputs/github-final-upload
```

上傳時請把該資料夾內的檔案放到 GitHub repository 根目錄。

不要上傳：

- `backups/`
- `work/`
- `outputs/` 外層資料夾本身
- 原始未整理的大量照片或影片

## Tesla 詢價表單

`tesla-quote.html` 目前會把詢價資料整理後送到既有 Google 表單，並保留一份最近送出的內容在瀏覽器本機作為除錯備份。

若之後要完整分欄管理 Tesla 詢價資料，建議建立一份 Tesla 專用 Google 表單，再更新 `tesla-quote.js` 內的 entry 欄位。

## 瀏覽人數統計

靜態網站無法自行統計所有訪客，需要串接外部統計服務。建議使用 Cloudflare Web Analytics，後台只有網站管理者能看，不會在前台顯示計數器。

設定方式：

1. 到 Cloudflare 新增 Web Analytics site。
2. 複製 Cloudflare 提供的 token。
3. 將 token 填入 `data/analytics-config.js` 的 `cloudflareWebAnalyticsToken`。
4. 重新上傳 `data/analytics-config.js`。

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
