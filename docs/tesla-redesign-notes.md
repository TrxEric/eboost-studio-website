# E Boost Studio Tesla 改版紀錄

## 這次定位

首頁改為以 Tesla 新車車主為主要轉換對象，核心訊息為：

```text
台中 Tesla 新車防護與整車升級中心
```

服務主軸放在 Model 3 / Model Y 的 PPF 犀牛皮、隔熱紙、改色膜與新車防護一次完成。

## 網站架構

- `index.html`：Tesla 導向首頁
- `tesla-quote.html`：Tesla 施工詢價頁
- `other-vehicles.html`：其他車款施工頁，承接舊版 V-Class、SUV、底盤、動力與保養內容
- `wrap-simulator.html`：車身貼膜顏色模擬器
- `data/tesla-site-data.js`：Tesla 方案、FAQ、表單選項與品牌資料
- `tracking.js`：CTA 與表單追蹤事件

## 主要導覽

- Tesla 新車方案
- PPF 犀牛皮
- Tesla 隔熱紙
- Tesla 改色
- 施工案例
- 接送車服務
- 關於艾佳
- 聯絡預約

## 已加入追蹤事件

- `click_line`
- `click_phone`
- `click_book_now`
- `start_tesla_quote_form`
- `submit_tesla_quote_form`
- `click_tesla_plan`
- `view_cases`
- `view_pickup_service`

## 後續需要補齊

- Tesla 施工案例照片與案例細節
- 各方案實際施工範圍與報價規則
- Google 地圖連結與營業時間
- 保固條款與膜料差異說明
- 如需更完整表單欄位，建議另外建立 Tesla 專用 Google 表單
