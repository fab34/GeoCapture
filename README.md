# Geo Capture

Geo Capture is an Obsidian plugin for fast place capture in travel journals, trip logs, restaurant notes, and photo-based memories.

Geo Capture 是一個專為 Obsidian 旅遊手帳、踩點紀錄、餐廳心得、照片回憶設計的快速地點插入插件。

## 中文說明

### 產品定位

Geo Capture 的核心目標不是取代大型地圖插件，而是讓使用者在寫筆記時，用最少步驟把「目前位置、店家、景點、座標、地圖連結、照片定位」插入到目前筆記。

它採用 note-first 設計：筆記是資料中心，地圖與定位服務只是輔助輸入。

### 目前功能

- 從目前裝置位置插入座標。
- 使用 Google Places 查詢目前位置附近的地點候選。
- 使用 OpenStreetMap Nominatim 或 Google Places 搜尋地點名稱。
- 在同一個 quick insert 流程中支援地點名稱、座標、地圖連結。
- 從剪貼簿解析常見地圖連結或座標。
- 從目前筆記游標附近的 JPG/JPEG 圖片讀取 EXIF GPS，並提供附近地點候選。
- 照片地點可插入目前游標位置，也可自動插入圖片下一行。
- 當圖片沒有定位資訊時，自動切回手動輸入地點名稱、座標或地圖連結。
- 支援多種 Markdown 插入格式：行內、callout、table row、自訂 template。
- 可選擇產生 Google Maps、Apple Maps 或 OpenStreetMap 連結。
- 支援多語系介面，預設跟隨 Obsidian 系統語系，也可手動指定英文、繁體中文或简体中文。

### 主要命令

- `Geo Capture: Quick insert place`
  輸入地點名稱、座標或地圖連結，選擇候選後插入筆記。

- `Geo Capture: Capture nearby place`
  取得目前位置，使用 Google Places 列出附近店家、景點、車站等候選地點。

- `Geo Capture: Insert current location`
  直接插入目前裝置座標。

- `Geo Capture: Insert location from clipboard`
  從剪貼簿解析 Google Maps、Apple Maps、OpenStreetMap 連結或座標。

- `Geo Capture: Suggest place from nearest image`
  找出目前游標附近的本機圖片，讀取 JPG/JPEG EXIF GPS，列出附近地點候選。

### Google Places 設定

Google Places 是選用功能。若要使用附近地點候選或 Google Places 搜尋，請在設定中：

1. 將 `Place search provider` 設為 `Google Places`。
2. 填入 `Google Places API key`。
3. 在 Google Cloud 啟用 `Places API (New)`。
4. 設定 `Nearby search radius`。

Geo Capture 使用 Google Places API New 的 `places:searchText` 與 `places:searchNearby`，並以 FieldMask 只請求必要欄位。

### 多語系

Geo Capture 預設使用 `System` 顯示語言，會跟隨 Obsidian 目前的 App 語系。也可以在設定頁手動選擇：

- `English`
- `繁體中文`
- `简体中文`

命令名稱、設定頁、提示訊息、搜尋框文字與部分預設插入內容都會套用對應語系。

### 照片地點插入位置

`Image place insert position` 可選擇：

- `目前游標位置`
- `圖片下一行`

若選擇 `圖片下一行`，`Suggest place from nearest image` 會把選定地點插入到偵測到的圖片正下方，適合旅遊手帳中「照片 + 地點註記」的寫法。

### 與 Cloudflare Media Sync 搭配

Geo Capture 很適合搭配 `fab34/cloudflare-media-sync`：

1. 使用者先把照片插入 Obsidian 筆記。
2. Geo Capture 從本機 JPG/JPEG 圖片讀取 EXIF GPS。
3. 使用者選擇附近地點或手動輸入地點。
4. Geo Capture 將地點資訊寫入 Markdown。
5. Cloudflare Media Sync 再將圖片同步到 Cloudflare R2 並改寫圖片連結。

因為地點資訊已經寫入筆記，即使圖片之後變成 R2 URL，筆記仍保留可讀的地點內容。

### 目前限制

- 圖片 EXIF GPS 目前支援本機 JPG/JPEG。
- HEIC、PNG、WebP、遠端圖片 URL 的定位讀取尚未實作。
- 很多照片會因為手機設定、社群軟體壓縮、AirDrop 或隱私設定而移除 GPS metadata。
- Google Places 需要 API key，可能產生 Google Maps Platform 費用。
- Google nearby search 目前只在設定 Google Places provider 且填入 API key 時啟用。

### 本機開發

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

## English

### Positioning

Geo Capture is a note-first location capture plugin for Obsidian. It is built for travel journals, check-in logs, restaurant notes, sightseeing notes, and photo-based trip reviews.

It is not designed to replace a full map workspace. Its job is to help you insert useful place information into the note you are already writing.

### Features

- Insert current device coordinates.
- Capture nearby place candidates with Google Places.
- Search places with OpenStreetMap Nominatim or Google Places.
- Use one quick insert flow for place names, coordinates, and map links.
- Parse map links or coordinates from the clipboard.
- Read EXIF GPS from nearby local JPG/JPEG images in the current note.
- Insert photo-derived places at the current cursor or directly below the image.
- Fall back to manual place input when image GPS metadata is missing.
- Insert Markdown-friendly place snippets in compact, callout, table row, or custom template formats.
- Generate Google Maps, Apple Maps, or OpenStreetMap links.
- Support multilingual UI with system language detection and manual language override.

### Commands

- `Geo Capture: Quick insert place`
  Search by place name, paste a map link, or type coordinates.

- `Geo Capture: Capture nearby place`
  Get current location and list nearby place candidates with Google Places.

- `Geo Capture: Insert current location`
  Insert raw current device coordinates.

- `Geo Capture: Insert location from clipboard`
  Parse coordinates or common map links from the clipboard.

- `Geo Capture: Suggest place from nearest image`
  Find a nearby local image in the current note, read JPG/JPEG EXIF GPS, and suggest nearby places.

### Google Places Setup

Google Places is optional. To enable Google-powered search and nearby capture:

1. Set `Place search provider` to `Google Places`.
2. Enter a `Google Places API key`.
3. Enable `Places API (New)` in Google Cloud.
4. Adjust `Nearby search radius`.

Geo Capture uses Places API New endpoints `places:searchText` and `places:searchNearby`, with a minimal FieldMask for required fields.

### Localization

Geo Capture uses `System` as the default display language and follows the current Obsidian app language. You can also manually choose:

- `English`
- `Traditional Chinese`
- `Simplified Chinese`

Command names, settings, notices, search placeholders, and some default inserted labels are localized.

### Image Insert Position

`Image place insert position` supports:

- `At current cursor`
- `Below the image`

When set to `Below the image`, `Suggest place from nearest image` inserts the selected place immediately below the detected image, which fits a photo-first travel journal layout.

### Cloudflare Media Sync Workflow

Geo Capture is designed to pair with `fab34/cloudflare-media-sync`:

1. Insert photos into an Obsidian note.
2. Let Geo Capture read local JPG/JPEG EXIF GPS.
3. Select a nearby place or enter a place manually.
4. Geo Capture writes durable location Markdown into the note.
5. Cloudflare Media Sync uploads the image to Cloudflare R2 and rewrites the image link.

The location annotation remains readable even after the local image link is replaced by an R2 URL.

### Current Limitations

- EXIF GPS reading currently supports local JPG/JPEG files.
- HEIC, PNG, WebP, and remote image URL metadata reading are not implemented yet.
- Many photos lose GPS metadata because of privacy settings, compression, social apps, or transfer workflows.
- Google Places requires an API key and may incur Google Maps Platform costs.
- Nearby search is available only when Google Places is selected and configured.

### Development

```bash
npm install
npm run dev
```

For local testing, symlink this folder into your vault:

```bash
ln -s /Users/fab34/Desktop/Git/GeoCapture /path/to/your/vault/.obsidian/plugins/geo-capture
```

Required Obsidian release files:

- `main.js`
- `manifest.json`
- `styles.css`
