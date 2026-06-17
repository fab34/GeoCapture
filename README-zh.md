# Geo Capture

[English README](./README.md)

Geo Capture 是一個專為 Obsidian 旅遊手帳、踩點紀錄、餐廳心得、照片回憶設計的快速地點插入插件。

## 產品定位

Geo Capture 的核心目標不是取代大型地圖插件，而是讓使用者在寫筆記時，用最少步驟把「目前位置、店家、景點、座標、地圖連結、照片定位」插入到目前筆記。

它採用 note-first 設計：筆記是資料中心，地圖與定位服務只是輔助輸入。

## 目前功能

- 從目前裝置位置插入座標。
- 使用 Google Places 查詢目前位置附近的地點候選。
- 使用 OpenStreetMap Nominatim 或 Google Places 搜尋地點名稱。
- 在同一個 quick insert 流程中支援地點名稱、座標、地圖連結。
- 從剪貼簿解析常見地圖連結或座標。
- 從目前筆記游標附近的 JPG/JPEG 圖片讀取 EXIF GPS，並提供附近地點候選。
- 若附近圖片已改寫成 R2 URL，或本機附件暫時不存在，可 fallback 讀取 R2 Media Sync 的本機 image metadata cache。
- 圖片定位成功後，Geo Capture 會在本機快取圖片 GPS，讓本機圖片之後被移動、刪除或手機端尚未同步時，仍可重複提供地點建議。
- 照片地點可插入目前游標位置，也可自動插入圖片下一行。
- 當圖片沒有定位資訊時，自動切回手動輸入地點名稱、座標或地圖連結。
- 支援多種 Markdown 插入格式：行內、callout、table row、自訂 template。
- 可選擇產生 Google Maps、Apple Maps 或 OpenStreetMap 連結。
- 支援多語系介面，預設跟隨 Obsidian 系統語系，也可手動指定英文、繁體中文或簡體中文。

## 主要命令

- `Geo Capture: Quick insert place`
  輸入地點名稱、座標或地圖連結，選擇候選後插入筆記。

- `Geo Capture: Capture nearby place`
  取得目前位置，使用 Google Places 列出附近店家、景點、車站等候選地點。

- `Geo Capture: Insert current location`
  直接插入目前裝置座標。

- `Geo Capture: Insert location from clipboard`
  從剪貼簿解析 Google Maps、Apple Maps、OpenStreetMap 連結或座標。

- `Geo Capture: Suggest place from nearest image`
  找出目前游標附近的圖片，讀取 JPG/JPEG EXIF GPS 或 R2 Media Sync metadata，列出附近地點候選。

## Google Places 設定

Google Places 是選用功能。若要使用附近地點候選或 Google Places 搜尋，請在設定中：

1. 將 `Place search provider` 設為 `Google Places`。
2. 填入 `Google Places API key`。
3. 在 Google Cloud 啟用 `Places API (New)`。
4. 設定 `Nearby search radius`。

Geo Capture 使用 Google Places API New 的 `places:searchText` 與 `places:searchNearby`，並以 FieldMask 只請求必要欄位。

## 多語系

Geo Capture 預設使用 `System` 顯示語言，會跟隨 Obsidian 目前的 App 語系。也可以在設定頁手動選擇：

- `English`
- `繁體中文`
- `簡體中文`

命令名稱、設定頁、提示訊息、搜尋框文字與部分預設插入內容都會套用對應語系。

## 照片地點插入位置

`Image place insert position` 可選擇：

- `目前游標位置`
- `圖片下一行`

若選擇 `圖片下一行`，`Suggest place from nearest image` 會把選定地點插入到偵測到的圖片正下方，適合旅遊手帳中「照片 + 地點註記」的寫法。

## 與 Cloudflare Media Sync 搭配

Geo Capture 很適合搭配 `fab34/cloudflare-media-sync`：

1. 使用者先把照片插入 Obsidian 筆記。
2. R2 Media Sync 在上傳前先讀取可用的 JPG/JPEG GPS 座標，並記錄在本機 `image_metadata.json` cache。
3. Cloudflare Media Sync 將圖片同步到 Cloudflare R2 並改寫圖片連結。
4. Geo Capture 可讀取本機 JPG/JPEG EXIF GPS；若筆記中已是 R2 URL，則 fallback 讀取 R2 Media Sync metadata cache。
5. 使用者選擇附近地點或手動輸入地點。
6. Geo Capture 將地點資訊寫入 Markdown。

因為地點資訊已經寫入筆記，即使圖片之後變成 R2 URL，筆記仍保留可讀的地點內容。

## 目前限制

- 圖片 EXIF GPS 目前支援本機 JPG/JPEG。
- R2 URL fallback 需要 R2 Media Sync 在圖片上傳前已成功擷取並記錄 GPS metadata。
- HEIC、PNG、WebP、遠端圖片 URL 的定位讀取尚未實作。
- 很多照片會因為手機設定、社群軟體壓縮、AirDrop 或隱私設定而移除 GPS metadata。
- Google Places 需要 API key，可能產生 Google Maps Platform 費用。
- Google nearby search 目前只在設定 Google Places provider 且填入 API key 時啟用。

## 隱私與資安

- Geo Capture 沒有 telemetry 或 analytics。
- Geo Capture 不會上傳筆記內容或圖片。
- 只有在使用者執行搜尋、附近地點或照片地點命令時，才會向選定的地點服務送出搜尋文字或座標。
- Google Places API key 會儲存在 Obsidian 本機插件資料中，僅用於 Google Places API 請求。
- 圖片 EXIF GPS 會在本機讀取；只有在使用 Google Places 查詢附近地點時，座標才會送到 Google。
- 圖片 EXIF 或 metadata 成功讀取後，Geo Capture 會在自己的 Obsidian 本機插件資料中保存小型圖片 GPS 快取。快取內容包含圖片識別資訊、座標、來源路徑標籤與時間戳，用於本機附件暫時不可用時仍可重複提供照片地點建議。
- 使用 Cloudflare Media Sync metadata fallback 時，Geo Capture 只會在本機讀取 `.obsidian/plugins/cloudflare-media-sync/image_metadata.json`，不會修改這份檔案。

詳細檢查紀錄請見 [docs/security/security-review.md](docs/security/security-review.md)。

## Release Provenance

Geo Capture 的 GitHub release 現在已加入 artifact attestation 流程。

每次正式發布後，GitHub Actions 可自動為下列 release 檔案建立 provenance attestation：

- `manifest.json`
- `main.js`
- `styles.css`

這可讓使用者驗證 release 檔案確實是由 GitHub 上的原始碼倉庫建置產生。

## 測試

桌機與手機測試清單請見 [docs/testing/desktop-mobile-test-plan.md](docs/testing/desktop-mobile-test-plan.md)。

送審前建議執行：

```bash
npm run check
```

## 本機開發

```bash
npm install
npm run dev
```

若要在 Obsidian 中測試，可將此資料夾 symlink 到 vault：

```bash
ln -s /Users/fab34/Desktop/Git/GeoCapture /path/to/your/vault/.obsidian/plugins/geo-capture
```

Obsidian release 必要檔案：

- `main.js`
- `manifest.json`
- `styles.css`

目前已發布版本可見 GitHub Releases：

- [0.1.12](https://github.com/fab34/GeoCapture/releases/tag/0.1.12)
