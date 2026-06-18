import { LocationConfidence, UiLanguage } from "./types";

export type LocaleCode = "en" | "zh-TW" | "zh-CN";
export type Translator = (key: TranslationKey, values?: Record<string, string | number>) => string;

type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    commandInsertCurrentLocation: "Insert current location",
    commandCaptureNearbyPlace: "Capture nearby place",
    commandQuickInsertPlace: "Quick insert place",
    commandSuggestPlaceFromImage: "Suggest place from nearest image",
    commandDiagnoseImageLocation: "Diagnose nearest image location",
    commandInsertLocationFromClipboard: "Insert location from clipboard",
    settingsTitle: "Geo Capture",
    settingUiLanguageName: "Display language",
    settingUiLanguageDesc: "Use System to follow the current Obsidian app language.",
    settingImageInsertPositionName: "Image place insert position",
    settingImageInsertPositionDesc: "Choose where photo-based place suggestions are inserted.",
    imageInsertAtCursor: "At current cursor",
    imageInsertBelowImage: "Below the image",
    languageSystem: "System",
    languageEnglish: "English",
    languageZhTw: "Traditional Chinese",
    languageZhCn: "Simplified Chinese",
    settingPlaceProviderName: "Place search provider",
    settingPlaceProviderDesc:
      "Nominatim is free for general search. Nearby place capture will use Google Places whenever a Google API key is configured.",
    providerNominatim: "OpenStreetMap Nominatim",
    providerGoogle: "Google Places",
    settingGoogleApiKeyName: "Google Places API key",
    settingGoogleApiKeyDesc: "Required only when using Google Places. Enable Places API (New) in Google Cloud.",
    settingGoogleApiKeyTestButton: "Test API key",
    noticeTestingGoogleApiKey: "Geo Capture: testing Google Places API key...",
    noticeGoogleApiKeyMissing: "Geo Capture: enter a Google Places API key first.",
    noticeGoogleApiKeyValid: "Geo Capture: Google Places API key is valid.",
    noticeGoogleApiKeyInvalid: "Geo Capture: Google Places API key test failed: {reason}",
    settingNearbyRadiusName: "Nearby search radius",
    settingNearbyRadiusDesc: "Radius in meters for current-location place suggestions.",
    settingDefaultFormatName: "Default insert format",
    settingDefaultFormatDesc: "Choose the Markdown shape used by capture commands.",
    formatCompact: "Compact line",
    formatCallout: "Callout",
    formatTableRow: "Table row",
    formatTemplate: "Custom template",
    settingMapsLinkProviderName: "Maps link provider",
    settingMapsLinkProviderDesc: "Used for generated map links in inserted snippets.",
    settingSearchLanguageName: "Search language",
    settingSearchLanguageDesc: "Preferred language sent to the search provider.",
    settingCustomTemplateName: "Custom template",
    settingCustomTemplateDesc: "Available tokens: {name}, {address}, {lat}, {lon}, {mapsUrl}, {sourceUrl}.",
    noticeGettingCurrentLocation: "Geo Capture: getting current location...",
    noticeRetryingCurrentLocation: "Geo Capture: high-accuracy location timed out. Retrying with lower accuracy...",
    noticeOpenEditableNote: "Geo Capture: open a Markdown note in editing mode first.",
    noticeUnableToGetLocation: "Geo Capture: unable to get location.",
    noticeLocationPermissionDenied:
      "Geo Capture: location permission was denied. Enable location access for Obsidian in system settings.",
    noticeLocationUnavailable:
      "Geo Capture: current location is unavailable on this device right now.",
    noticeLocationTimeout:
      "Geo Capture: location request timed out. Check system location services, network, or try again.",
    noticeConfigureGooglePlaces: "Geo Capture: configure Google Places API key to capture nearby places.",
    noticeSearchingNearbyPlaces: "Geo Capture: searching nearby places...",
    noticeNoNearbyPlaces: "Geo Capture: no nearby places found. Inserting raw current location.",
    noticeNearbyCaptureFailed: "Geo Capture: nearby capture failed.",
    noticeNoClipboardLocation: "Geo Capture: no supported map link or coordinates found on clipboard.",
    noticeClipboardReadFailed: "Geo Capture: unable to read clipboard location.",
    noticeOpenNoteWithImage: "Geo Capture: open a note with an image first.",
    noticeNoLocalImage: "Geo Capture: no local image found near the cursor. You can enter a place manually.",
    noticeUnsupportedImageType:
      "Geo Capture: this image type is not supported for EXIF GPS yet. You can enter a place manually.",
    noticeNoImageGps: "Geo Capture: no GPS metadata found in this image. You can enter a place manually.",
    noticeImageLocationDiagnostics:
      "Geo Capture diagnostics: image={image}; source={source}; local={local}; exif={exif}; exifError={exifError}; cache={cache}; metadata={metadata}; next={next}; vaultImages={vaultImages}; sameName={sameName}; sameStem={sameStem}; candidates={candidates}; details={reason}",
    noticeImageGpsFoundNoProvider:
      "Geo Capture: image GPS found. Configure Google Places to see nearby place suggestions.",
    noticeImageGpsSearching: "Geo Capture: image GPS found. Searching nearby places...",
    noticeImageMetadataFailed: "Geo Capture: unable to read image metadata. You can enter a place manually.",
    noticePlaceSearchFailed: "Geo Capture: place search failed.",
    noticeInsertedPlace: "Geo Capture: inserted {name}.",
    noticeSkippedDuplicatePlace: "Geo Capture: skipped duplicate place {name}. It already appears in this note.",
    noticeNearbySearchFallbackCurrent:
      "Geo Capture: nearby place search failed. Inserting raw current location instead.",
    noticeNearbySearchFallbackImage:
      "Geo Capture: nearby place search failed. Showing the photo GPS location instead.",
    noticeImageNoNearbyPlaces:
      "Geo Capture: no nearby places found. Showing the photo GPS location instead.",
    diagnosticSourceExif: "local EXIF",
    diagnosticSourceMetadata: "R2 metadata cache",
    diagnosticSourceCache: "Geo Capture cache",
    diagnosticSourceNone: "not resolved",
    diagnosticNextReady: "ready to suggest nearby places",
    diagnosticNextCheckGps: "photo has no usable GPS yet",
    diagnosticNextResyncImage: "reinsert or resync the image so a local file or metadata cache becomes available",
    diagnosticNextUseCache: "cached GPS can still be used even when the local image file is unavailable",
    placeholderQuickInsert: "Search a place, paste a map link, or type lat,lng...",
    placeholderNearbyChoice: "Choose a nearby place...",
    unknownAddress: "Unknown address",
    currentLocation: "Current location",
    gpsAccuracy: "GPS accuracy around {meters}m",
    photoLocation: "Photo location: {name}",
    confidenceGpsDerived: "GPS",
    confidenceSearchSelected: "Search result",
    confidenceManualCoordinate: "Manual coordinates",
    confidenceManualText: "Manual text",
    confidenceMapLink: "Map link",
  },
  "zh-TW": {
    commandInsertCurrentLocation: "插入目前位置",
    commandCaptureNearbyPlace: "擷取附近地點",
    commandQuickInsertPlace: "快速插入地點",
    commandSuggestPlaceFromImage: "從附近圖片建議地點",
    commandDiagnoseImageLocation: "診斷附近圖片定位",
    commandInsertLocationFromClipboard: "從剪貼簿插入位置",
    settingsTitle: "Geo Capture",
    settingUiLanguageName: "顯示語言",
    settingUiLanguageDesc: "選擇「系統」時，會跟隨目前 Obsidian App 語系。",
    settingImageInsertPositionName: "圖片地點插入位置",
    settingImageInsertPositionDesc: "選擇從照片建議地點後，要插入到哪裡。",
    imageInsertAtCursor: "目前游標位置",
    imageInsertBelowImage: "圖片下一行",
    languageSystem: "系統",
    languageEnglish: "English",
    languageZhTw: "繁體中文",
    languageZhCn: "简体中文",
    settingPlaceProviderName: "地點搜尋服務",
    settingPlaceProviderDesc: "Nominatim 可用於一般搜尋。只要設定 Google API key，附近地點擷取就會自動使用 Google Places。",
    providerNominatim: "OpenStreetMap Nominatim",
    providerGoogle: "Google Places",
    settingGoogleApiKeyName: "Google Places API key",
    settingGoogleApiKeyDesc: "只有使用 Google Places 時需要。請在 Google Cloud 啟用 Places API (New)。",
    settingGoogleApiKeyTestButton: "檢測 API key",
    noticeTestingGoogleApiKey: "Geo Capture：正在檢測 Google Places API key...",
    noticeGoogleApiKeyMissing: "Geo Capture：請先輸入 Google Places API key。",
    noticeGoogleApiKeyValid: "Geo Capture：Google Places API key 可正常使用。",
    noticeGoogleApiKeyInvalid: "Geo Capture：Google Places API key 檢測失敗：{reason}",
    settingNearbyRadiusName: "附近搜尋半徑",
    settingNearbyRadiusDesc: "目前位置附近地點建議使用的搜尋半徑，單位為公尺。",
    settingDefaultFormatName: "預設插入格式",
    settingDefaultFormatDesc: "選擇擷取命令要插入的 Markdown 格式。",
    formatCompact: "行內格式",
    formatCallout: "Callout",
    formatTableRow: "表格列",
    formatTemplate: "自訂 template",
    settingMapsLinkProviderName: "地圖連結服務",
    settingMapsLinkProviderDesc: "用於產生插入片段中的地圖連結。",
    settingSearchLanguageName: "搜尋語言",
    settingSearchLanguageDesc: "傳送給地點搜尋服務的偏好語言。",
    settingCustomTemplateName: "自訂 template",
    settingCustomTemplateDesc: "可用變數：{name}, {address}, {lat}, {lon}, {mapsUrl}, {sourceUrl}。",
    noticeGettingCurrentLocation: "Geo Capture：正在取得目前位置...",
    noticeRetryingCurrentLocation: "Geo Capture：高精度定位逾時，正在改用較低精度重試...",
    noticeOpenEditableNote: "Geo Capture：請先開啟 Markdown 筆記並進入編輯模式。",
    noticeUnableToGetLocation: "Geo Capture：無法取得目前位置。",
    noticeLocationPermissionDenied: "Geo Capture：定位權限被拒絕，請到系統設定允許 Obsidian 存取定位。",
    noticeLocationUnavailable: "Geo Capture：此裝置目前無法提供位置資訊。",
    noticeLocationTimeout: "Geo Capture：定位要求逾時。請檢查系統定位服務、網路狀態，或稍後再試。",
    noticeConfigureGooglePlaces: "Geo Capture：請設定 Google Places API key 以擷取附近地點。",
    noticeSearchingNearbyPlaces: "Geo Capture：正在搜尋附近地點...",
    noticeNoNearbyPlaces: "Geo Capture：找不到附近地點，將插入原始目前位置。",
    noticeNearbyCaptureFailed: "Geo Capture：附近地點擷取失敗。",
    noticeNoClipboardLocation: "Geo Capture：剪貼簿中沒有支援的地圖連結或座標。",
    noticeClipboardReadFailed: "Geo Capture：無法讀取剪貼簿位置。",
    noticeOpenNoteWithImage: "Geo Capture：請先開啟包含圖片的筆記。",
    noticeNoLocalImage: "Geo Capture：游標附近找不到本機圖片，可改用手動輸入地點。",
    noticeUnsupportedImageType: "Geo Capture：此圖片格式尚未支援 EXIF GPS，可改用手動輸入地點。",
    noticeNoImageGps: "Geo Capture：此圖片沒有 GPS metadata，可改用手動輸入地點。",
    noticeImageLocationDiagnostics:
      "Geo Capture 診斷：圖片={image}；來源={source}；本機={local}；EXIF={exif}；EXIF錯誤={exifError}；快取={cache}；metadata={metadata}；下一步={next}；vault圖片={vaultImages}；同名={sameName}；同主檔名={sameStem}；候選={candidates}；細節={reason}",
    noticeImageGpsFoundNoProvider: "Geo Capture：已找到圖片 GPS。設定 Google Places 後可查看附近地點建議。",
    noticeImageGpsSearching: "Geo Capture：已找到圖片 GPS，正在搜尋附近地點...",
    noticeImageMetadataFailed: "Geo Capture：無法讀取圖片 metadata，可改用手動輸入地點。",
    noticePlaceSearchFailed: "Geo Capture：地點搜尋失敗。",
    noticeInsertedPlace: "Geo Capture：已插入 {name}。",
    noticeSkippedDuplicatePlace: "Geo Capture：已略過重複地點 {name}，這份筆記裡已經有相同內容。",
    noticeNearbySearchFallbackCurrent: "Geo Capture：附近地點搜尋失敗，改為插入原始目前位置。",
    noticeNearbySearchFallbackImage: "Geo Capture：附近地點搜尋失敗，改為顯示照片 GPS 位置。",
    noticeImageNoNearbyPlaces: "Geo Capture：找不到附近地點，改為顯示照片 GPS 位置。",
    diagnosticSourceExif: "本機 EXIF",
    diagnosticSourceMetadata: "R2 metadata 快取",
    diagnosticSourceCache: "Geo Capture 快取",
    diagnosticSourceNone: "尚未解析成功",
    diagnosticNextReady: "可直接進行附近地點建議",
    diagnosticNextCheckGps: "這張照片目前沒有可用的 GPS 來源",
    diagnosticNextResyncImage: "請重新插入或重新同步圖片，讓本機檔案或 metadata 快取重新可用",
    diagnosticNextUseCache: "即使本機圖片暫時不可用，仍可使用快取 GPS",
    placeholderQuickInsert: "搜尋地點、貼上地圖連結，或輸入 lat,lng...",
    placeholderNearbyChoice: "選擇附近地點...",
    unknownAddress: "未知地址",
    currentLocation: "目前位置",
    gpsAccuracy: "GPS 精準度約 {meters}m",
    photoLocation: "照片位置：{name}",
    confidenceGpsDerived: "GPS",
    confidenceSearchSelected: "搜尋結果",
    confidenceManualCoordinate: "手動座標",
    confidenceManualText: "手動文字",
    confidenceMapLink: "地圖連結",
  },
  "zh-CN": {
    commandInsertCurrentLocation: "插入当前位置",
    commandCaptureNearbyPlace: "捕捉附近地点",
    commandQuickInsertPlace: "快速插入地点",
    commandSuggestPlaceFromImage: "从附近图片建议地点",
    commandDiagnoseImageLocation: "诊断附近图片定位",
    commandInsertLocationFromClipboard: "从剪贴板插入位置",
    settingsTitle: "Geo Capture",
    settingUiLanguageName: "显示语言",
    settingUiLanguageDesc: "选择“系统”时，会跟随当前 Obsidian App 语言。",
    settingImageInsertPositionName: "图片地点插入位置",
    settingImageInsertPositionDesc: "选择从照片建议地点后，要插入到哪里。",
    imageInsertAtCursor: "当前光标位置",
    imageInsertBelowImage: "图片下一行",
    languageSystem: "系统",
    languageEnglish: "English",
    languageZhTw: "繁體中文",
    languageZhCn: "简体中文",
    settingPlaceProviderName: "地点搜索服务",
    settingPlaceProviderDesc: "Nominatim 可用于一般搜索。只要设置 Google API key，附近地点捕捉就会自动使用 Google Places。",
    providerNominatim: "OpenStreetMap Nominatim",
    providerGoogle: "Google Places",
    settingGoogleApiKeyName: "Google Places API key",
    settingGoogleApiKeyDesc: "仅使用 Google Places 时需要。请在 Google Cloud 启用 Places API (New)。",
    settingGoogleApiKeyTestButton: "检测 API key",
    noticeTestingGoogleApiKey: "Geo Capture：正在检测 Google Places API key...",
    noticeGoogleApiKeyMissing: "Geo Capture：请先输入 Google Places API key。",
    noticeGoogleApiKeyValid: "Geo Capture：Google Places API key 可正常使用。",
    noticeGoogleApiKeyInvalid: "Geo Capture：Google Places API key 检测失败：{reason}",
    settingNearbyRadiusName: "附近搜索半径",
    settingNearbyRadiusDesc: "当前位置附近地点建议使用的搜索半径，单位为米。",
    settingDefaultFormatName: "默认插入格式",
    settingDefaultFormatDesc: "选择捕捉命令要插入的 Markdown 格式。",
    formatCompact: "行内格式",
    formatCallout: "Callout",
    formatTableRow: "表格行",
    formatTemplate: "自定义 template",
    settingMapsLinkProviderName: "地图链接服务",
    settingMapsLinkProviderDesc: "用于生成插入片段中的地图链接。",
    settingSearchLanguageName: "搜索语言",
    settingSearchLanguageDesc: "发送给地点搜索服务的偏好语言。",
    settingCustomTemplateName: "自定义 template",
    settingCustomTemplateDesc: "可用变量：{name}, {address}, {lat}, {lon}, {mapsUrl}, {sourceUrl}。",
    noticeGettingCurrentLocation: "Geo Capture：正在获取当前位置...",
    noticeRetryingCurrentLocation: "Geo Capture：高精度定位超时，正在改用较低精度重试...",
    noticeOpenEditableNote: "Geo Capture：请先打开 Markdown 笔记并进入编辑模式。",
    noticeUnableToGetLocation: "Geo Capture：无法获取当前位置。",
    noticeLocationPermissionDenied: "Geo Capture：定位权限被拒绝，请到系统设置允许 Obsidian 访问定位。",
    noticeLocationUnavailable: "Geo Capture：此设备当前无法提供位置信息。",
    noticeLocationTimeout: "Geo Capture：定位请求超时。请检查系统定位服务、网络状态，或稍后再试。",
    noticeConfigureGooglePlaces: "Geo Capture：请设置 Google Places API key 以捕捉附近地点。",
    noticeSearchingNearbyPlaces: "Geo Capture：正在搜索附近地点...",
    noticeNoNearbyPlaces: "Geo Capture：找不到附近地点，将插入原始当前位置。",
    noticeNearbyCaptureFailed: "Geo Capture：附近地点捕捉失败。",
    noticeNoClipboardLocation: "Geo Capture：剪贴板中没有支持的地图链接或坐标。",
    noticeClipboardReadFailed: "Geo Capture：无法读取剪贴板位置。",
    noticeOpenNoteWithImage: "Geo Capture：请先打开包含图片的笔记。",
    noticeNoLocalImage: "Geo Capture：光标附近找不到本地图片，可改用手动输入地点。",
    noticeUnsupportedImageType: "Geo Capture：此图片格式尚未支持 EXIF GPS，可改用手动输入地点。",
    noticeNoImageGps: "Geo Capture：此图片没有 GPS metadata，可改用手动输入地点。",
    noticeImageLocationDiagnostics:
      "Geo Capture 诊断：图片={image}；来源={source}；本地={local}；EXIF={exif}；EXIF错误={exifError}；缓存={cache}；metadata={metadata}；下一步={next}；vault图片={vaultImages}；同名={sameName}；同主文件名={sameStem}；候选={candidates}；细节={reason}",
    noticeImageGpsFoundNoProvider: "Geo Capture：已找到图片 GPS。设置 Google Places 后可查看附近地点建议。",
    noticeImageGpsSearching: "Geo Capture：已找到图片 GPS，正在搜索附近地点...",
    noticeImageMetadataFailed: "Geo Capture：无法读取图片 metadata，可改用手动输入地点。",
    noticePlaceSearchFailed: "Geo Capture：地点搜索失败。",
    noticeInsertedPlace: "Geo Capture：已插入 {name}。",
    noticeSkippedDuplicatePlace: "Geo Capture：已跳过重复地点 {name}，这篇笔记里已经有相同内容。",
    noticeNearbySearchFallbackCurrent: "Geo Capture：附近地点搜索失败，改为插入原始当前位置。",
    noticeNearbySearchFallbackImage: "Geo Capture：附近地点搜索失败，改为显示照片 GPS 位置。",
    noticeImageNoNearbyPlaces: "Geo Capture：找不到附近地点，改为显示照片 GPS 位置。",
    diagnosticSourceExif: "本地 EXIF",
    diagnosticSourceMetadata: "R2 metadata 缓存",
    diagnosticSourceCache: "Geo Capture 缓存",
    diagnosticSourceNone: "尚未解析成功",
    diagnosticNextReady: "可直接进行附近地点建议",
    diagnosticNextCheckGps: "这张照片目前没有可用的 GPS 来源",
    diagnosticNextResyncImage: "请重新插入或重新同步图片，让本地文件或 metadata 缓存重新可用",
    diagnosticNextUseCache: "即使本地图片暂时不可用，仍可使用缓存 GPS",
    placeholderQuickInsert: "搜索地点、粘贴地图链接，或输入 lat,lng...",
    placeholderNearbyChoice: "选择附近地点...",
    unknownAddress: "未知地址",
    currentLocation: "当前位置",
    gpsAccuracy: "GPS 精确度约 {meters}m",
    photoLocation: "照片位置：{name}",
    confidenceGpsDerived: "GPS",
    confidenceSearchSelected: "搜索结果",
    confidenceManualCoordinate: "手动坐标",
    confidenceManualText: "手动文字",
    confidenceMapLink: "地图链接",
  },
} satisfies Record<LocaleCode, Record<string, string>>;

const confidenceKeys: Record<LocationConfidence, TranslationKey> = {
  "gps-derived": "confidenceGpsDerived",
  "search-selected": "confidenceSearchSelected",
  "manual-coordinate": "confidenceManualCoordinate",
  "manual-text": "confidenceManualText",
  "map-link": "confidenceMapLink",
};

export function createTranslator(language: UiLanguage): Translator {
  const locale = getEffectiveLocale(language);

  return (key, values) => interpolate(translations[locale][key] ?? translations.en[key], values);
}

export function getEffectiveLocale(language: UiLanguage): LocaleCode {
  if (language !== "system") {
    return normalizeLocale(language);
  }

  const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "en";
  return normalizeLocale(browserLanguage || "en");
}

export function getProviderLanguage(language: UiLanguage, fallback: string): string {
  if (fallback.trim()) {
    return fallback.trim();
  }

  return getEffectiveLocale(language);
}

export function translateConfidence(t: Translator, confidence: LocationConfidence): string {
  return t(confidenceKeys[confidence]);
}

function normalizeLocale(language: string): LocaleCode {
  const normalized = language.toLowerCase();

  if (normalized === "zh-cn" || normalized === "zh-sg" || normalized.includes("hans")) {
    return "zh-CN";
  }

  if (normalized.startsWith("zh")) {
    return "zh-TW";
  }

  return "en";
}

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)}/g, (_, key: string) => String(values[key] ?? ""));
}
