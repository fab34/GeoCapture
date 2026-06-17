import { Editor, MarkdownView, Notice, Platform, Plugin, TFile } from "obsidian";
import { readPlaceFromClipboard } from "./clipboard";
import { readExifGps } from "./exif";
import { formatPlace } from "./format";
import {
  ImageContext,
  diagnoseImageResolution,
  findNearestImageContext,
  isSupportedExifImage,
} from "./images";
import { createTranslator, getProviderLanguage, Translator } from "./i18n";
import { CurrentLocationError, getCurrentPosition } from "./location";
import { findMediaSyncGps, findMediaSyncGpsWithDiagnostics } from "./mediaSyncMetadata";
import { PlaceListModal } from "./placeListModal";
import { GooglePlacesProvider } from "./providers/googlePlaces";
import { NominatimProvider } from "./providers/nominatim";
import { PlaceSearchModal } from "./searchModal";
import { DEFAULT_SETTINGS, GeoCaptureSettingTab } from "./settings";
import { CachedImageGps, GeoCaptureSettings, GeoPlace, NearbySearchProvider, SearchProvider } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default class GeoCapturePlugin extends Plugin {
  declare settings: GeoCaptureSettings;

  async onload(): Promise<void> {
    try {
      await this.loadSettings();
    } catch (error) {
      console.error("Geo Capture: failed to load settings.", error);
      this.settings = { ...DEFAULT_SETTINGS };
      new Notice("Geo Capture: failed to load saved settings. Using defaults.");
    }

    try {
      this.registerCommands();
      this.addSettingTab(new GeoCaptureSettingTab(this.app, this));
    } catch (error) {
      console.error("Geo Capture: failed to finish plugin startup.", error);
      new Notice("Geo Capture: startup failed. The plugin was loaded in safe mode.");
    }
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(isRecord(loaded) ? loaded : {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  getSearchLanguage(): string {
    return getProviderLanguage(this.settings.uiLanguage, this.settings.searchLanguage);
  }

  showNotice(key: Parameters<Translator>[0], values?: Record<string, string | number>): void {
    new Notice(this.t(key, values));
  }

  private registerCommands(): void {
    this.addCommand({
      id: "insert-current-location",
      name: this.t("commandInsertCurrentLocation"),
      callback: async () => {
        const editor = this.getActiveEditor();
        if (!editor) {
          return;
        }
        await this.captureCurrentLocation(editor);
      },
    });

    this.addCommand({
      id: "capture-nearby-place",
      name: this.t("commandCaptureNearbyPlace"),
      callback: async () => {
        const editor = this.getActiveEditor();
        if (!editor) {
          return;
        }
        await this.captureNearbyPlace(editor);
      },
    });

    this.addCommand({
      id: "search-place-and-insert",
      name: this.t("commandQuickInsertPlace"),
      callback: () => {
        const editor = this.getActiveEditor();
        if (!editor) {
          return;
        }
        this.openManualPlaceSearch(editor);
      },
    });

    this.addCommand({
      id: "suggest-place-from-image",
      name: this.t("commandSuggestPlaceFromImage"),
      callback: async () => {
        const editor = this.getActiveEditor();
        if (!editor) {
          return;
        }
        await this.capturePlaceFromNearestImage(editor);
      },
    });

    this.addCommand({
      id: "diagnose-nearest-image-location",
      name: this.t("commandDiagnoseImageLocation"),
      callback: async () => {
        const editor = this.getActiveEditor();
        if (!editor) {
          return;
        }
        await this.diagnoseNearestImageLocation(editor);
      },
    });

    this.addCommand({
      id: "insert-location-from-clipboard",
      name: this.t("commandInsertLocationFromClipboard"),
      callback: async () => {
        const editor = this.getActiveEditor();
        if (!editor) {
          return;
        }
        await this.captureClipboardLocation(editor);
      },
    });
  }

  private async captureCurrentLocation(editor: Editor): Promise<void> {
    try {
      new Notice(this.t("noticeGettingCurrentLocation"));
      const place = await getCurrentPosition(this.getCurrentPositionLabels());
      await this.insertPlace(editor, place);
    } catch (error) {
      console.error(error);
      this.showLocationError(error);
    }
  }

  private async captureNearbyPlace(editor: Editor): Promise<void> {
    try {
      const provider = this.getNearbyProvider();

      if (!provider) {
        new Notice(this.t("noticeConfigureGooglePlaces"));
        await this.captureCurrentLocation(editor);
        return;
      }

      new Notice(this.t("noticeGettingCurrentLocation"));
      const currentLocation = await getCurrentPosition(this.getCurrentPositionLabels());

      new Notice(this.t("noticeSearchingNearbyPlaces"));
      const places = await provider.searchNearby(
        currentLocation,
        this.getSearchLanguage(),
        this.settings.nearbyRadiusMeters,
      );

      if (places.length === 0) {
        new Notice(this.t("noticeNoNearbyPlaces"));
        await this.insertPlace(editor, currentLocation);
        return;
      }

      new PlaceListModal(this.app, [currentLocation, ...places], this.t.bind(this), async (place) => {
        await this.insertPlace(editor, place);
      }).open();
    } catch (error) {
      console.error(error);
      if (error instanceof CurrentLocationError) {
        this.showLocationError(error);
      } else {
        new Notice(error instanceof Error ? `Geo Capture: ${error.message}` : this.t("noticeNearbyCaptureFailed"));
      }
    }
  }

  private async captureClipboardLocation(editor: Editor): Promise<void> {
    try {
      const place = await readPlaceFromClipboard();
      if (!place) {
        new Notice(
          this.isMobileRuntime() ? this.t("noticeClipboardReadFailed") : this.t("noticeNoClipboardLocation"),
        );
        return;
      }

      await this.insertPlace(editor, place);
    } catch (error) {
      console.error(error);
      new Notice(this.t("noticeClipboardReadFailed"));
    }
  }

  private async capturePlaceFromNearestImage(editor: Editor): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();

    if (!(activeFile instanceof TFile)) {
      new Notice(this.t("noticeOpenNoteWithImage"));
      return;
    }

    const imageContext = findNearestImageContext(this.app, editor, activeFile);

    if (!imageContext) {
      new Notice(this.t("noticeNoLocalImage"));
      this.openManualPlaceSearch(editor);
      return;
    }

    const imageFile = imageContext.file;
    let point: GeoPlace | null = null;

    if (imageFile && isSupportedExifImage(imageFile)) {
      try {
        const arrayBuffer = await this.app.vault.readBinary(imageFile);
        const exifPoint = readExifGps(arrayBuffer);

        if (exifPoint) {
          point = {
            ...exifPoint,
            name: this.t("photoLocation", { name: imageFile.basename }),
            address: imageFile.path,
            source: "image-exif",
            confidence: "gps-derived",
          };
          await this.rememberImageGps(imageContext, imageFile, {
            ...exifPoint,
            label: imageFile.basename,
            sourcePath: imageFile.path,
            updatedAt: Date.now(),
          });
        }
      } catch (error) {
        console.error(error);
      }
    } else if (imageFile && !isSupportedExifImage(imageFile)) {
      new Notice(this.t("noticeUnsupportedImageType"));
    }

    if (!point) {
      const metadataMatch = await findMediaSyncGps(this.app, imageContext.path);
      if (metadataMatch) {
        point = {
          ...metadataMatch.point,
          name: this.t("photoLocation", { name: metadataMatch.label }),
          address: metadataMatch.sourcePath,
          source: "media-sync-metadata",
          confidence: "gps-derived",
        };
        await this.rememberImageGps(imageContext, imageFile, {
          ...metadataMatch.point,
          label: metadataMatch.label,
          sourcePath: metadataMatch.sourcePath,
          updatedAt: Date.now(),
        });
      }
    }

    if (!point) {
      const cachedGps = this.findCachedImageGps(imageContext, imageFile);
      if (cachedGps) {
        point = {
          lat: cachedGps.lat,
          lon: cachedGps.lon,
          name: this.t("photoLocation", { name: cachedGps.label }),
          address: cachedGps.sourcePath,
          source: "geo-capture-cache",
          confidence: "gps-derived",
        };
      }
    }

    if (!point) {
      new Notice(this.t("noticeNoImageGps"));
      this.openManualPlaceSearch(editor);
      return;
    }

    try {
      const provider = this.getNearbyProvider();

      if (!provider) {
        new Notice(this.t("noticeImageGpsFoundNoProvider"));
        new PlaceListModal(this.app, [point], this.t.bind(this), async (place) => {
          await this.insertPlace(editor, place, this.getImageInsertTarget(imageContext));
        }).open();
        return;
      }

      new Notice(this.t("noticeImageGpsSearching"));
      const places = await provider.searchNearby(
        point,
        this.getSearchLanguage(),
        this.settings.nearbyRadiusMeters,
      );

      new PlaceListModal(this.app, [point, ...places], this.t.bind(this), async (place) => {
        await this.insertPlace(editor, place, this.getImageInsertTarget(imageContext));
      }).open();
    } catch (error) {
      console.error(error);
      new Notice(error instanceof Error ? `Geo Capture: ${error.message}` : this.t("noticeNearbyCaptureFailed"));
      this.openManualPlaceSearch(editor);
    }
  }

  private async diagnoseNearestImageLocation(editor: Editor): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();

    if (!(activeFile instanceof TFile)) {
      new Notice(this.t("noticeOpenNoteWithImage"));
      return;
    }

    const imageContext = findNearestImageContext(this.app, editor, activeFile);

    if (!imageContext) {
      new Notice(this.t("noticeNoLocalImage"));
      return;
    }

    const imageFile = imageContext.file;
    let exifStatus = "not-checked";
    let exifError = "none";

    if (imageFile) {
      if (isSupportedExifImage(imageFile)) {
        try {
          const arrayBuffer = await this.app.vault.readBinary(imageFile);
          const exifPoint = readExifGps(arrayBuffer);
          exifStatus = exifPoint
            ? `yes ${exifPoint.lat.toFixed(6)},${exifPoint.lon.toFixed(6)}`
            : "no";
        } catch (error) {
          exifStatus = "error";
          exifError = error instanceof Error ? error.message : String(error);
        }
      } else {
        exifStatus = "unsupported-type";
      }
    }

    const resolutionDiagnostics = diagnoseImageResolution(this.app, imageContext.path);
    const cachedGps = this.findCachedImageGps(imageContext, imageFile);
    const { diagnostics } = await findMediaSyncGpsWithDiagnostics(this.app, imageContext.path);
    const reason = exifStatus.startsWith("yes")
      ? "local EXIF GPS found; metadata fallback not needed"
      : cachedGps
        ? "Geo Capture GPS cache found; local image file not required"
      : diagnostics.reason;

    new Notice(
      this.t("noticeImageLocationDiagnostics", {
        image: imageContext.path,
        local: imageContext.file ? "yes" : "no",
        exif: exifStatus,
        exifError,
        vaultImages: resolutionDiagnostics.vaultImages,
        sameName: resolutionDiagnostics.sameName,
        sameStem: resolutionDiagnostics.sameStem,
        candidates: resolutionDiagnostics.candidates,
        cache: cachedGps ? `yes ${cachedGps.lat.toFixed(6)},${cachedGps.lon.toFixed(6)}` : "no",
        metadata: diagnostics.metadataFound ? "yes" : "no",
        entries: diagnostics.entriesChecked,
        gpsEntries: diagnostics.entriesWithGps,
        match: diagnostics.matchedEntry ? "yes" : "no",
        reason,
      }),
      12000,
    );
  }

  private async insertPlace(editor: Editor, place: GeoPlace, target?: InsertTarget): Promise<void> {
    const markdown = formatPlace(place, this.settings);
    const insertTarget = target ?? { type: "cursor" };

    if (insertTarget.type === "below-line") {
      this.insertBelowLine(editor, insertTarget.line, markdown);
    } else {
      editor.replaceSelection(markdown);
      this.ensureTrailingNewline(editor);
    }

    new Notice(this.t("noticeInsertedPlace", { name: place.name }));
  }

  private insertBelowLine(editor: Editor, line: number, markdown: string): void {
    const insertLine = Math.min(line + 1, editor.lineCount());
    const insertText = `\n${markdown}\n`;
    editor.replaceRange(insertText, { line: insertLine, ch: 0 });
    editor.setCursor({ line: insertLine + markdown.split("\n").length, ch: 0 });
  }

  private ensureTrailingNewline(editor: Editor): void {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    if (line.slice(cursor.ch).trim().length === 0) {
      editor.replaceRange("\n", cursor);
    }
  }

  private getSearchProvider(): SearchProvider {
    if (this.settings.placeProvider === "google" && this.settings.googlePlacesApiKey) {
      return new GooglePlacesProvider(this.settings.googlePlacesApiKey);
    }

    return new NominatimProvider();
  }

  private getNearbyProvider(): NearbySearchProvider | null {
    if (this.settings.googlePlacesApiKey) {
      return new GooglePlacesProvider(this.settings.googlePlacesApiKey);
    }

    return null;
  }

  private openManualPlaceSearch(editor: Editor): void {
    new PlaceSearchModal(this.app, this.getSearchProvider(), this.getSearchLanguage(), this.t.bind(this), async (place) => {
      await this.insertPlace(editor, place);
    }).open();
  }

  private getCurrentPositionLabels(): Parameters<typeof getCurrentPosition>[0] {
    return {
      currentLocation: this.t("currentLocation"),
      gpsAccuracy: (meters: number) => this.t("gpsAccuracy", { meters }),
      retryingCurrentLocation: this.t("noticeRetryingCurrentLocation"),
    };
  }

  private showLocationError(error: unknown): void {
    if (error instanceof CurrentLocationError) {
      if (error.code === "permission-denied") {
        new Notice(this.t("noticeLocationPermissionDenied"));
        return;
      }

      if (error.code === "timeout") {
        new Notice(this.t("noticeLocationTimeout"));
        return;
      }

      if (error.code === "unavailable" || error.code === "unsupported") {
        new Notice(this.t("noticeLocationUnavailable"));
        return;
      }
    }

    new Notice(error instanceof Error ? `Geo Capture: ${error.message}` : this.t("noticeUnableToGetLocation"));
  }

  private getImageInsertTarget(imageContext: ImageContext): InsertTarget {
    if (this.settings.imageInsertPosition === "below-image") {
      return {
        type: "below-line",
        line: imageContext.line,
      };
    }

    return { type: "cursor" };
  }

  private findCachedImageGps(imageContext: ImageContext, imageFile: TFile | null): CachedImageGps | null {
    const cache = this.settings.imageGpsCache ?? {};

    for (const key of this.getImageCacheKeys(imageContext, imageFile)) {
      const cached = cache[key];
      if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lon)) {
        return cached;
      }
    }

    return null;
  }

  private async rememberImageGps(
    imageContext: ImageContext,
    imageFile: TFile | null,
    gps: CachedImageGps,
  ): Promise<void> {
    this.settings.imageGpsCache = this.settings.imageGpsCache ?? {};
    this.pruneImageGpsCache();

    for (const key of this.getImageCacheKeys(imageContext, imageFile)) {
      this.settings.imageGpsCache[key] = gps;
    }

    await this.saveSettings();
  }

  private pruneImageGpsCache(): void {
    const entries = Object.entries(this.settings.imageGpsCache ?? {});

    if (entries.length <= 300) {
      return;
    }

    const keep = entries
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .slice(0, 200);
    this.settings.imageGpsCache = Object.fromEntries(keep);
  }

  private getImageCacheKeys(imageContext: ImageContext, imageFile: TFile | null): string[] {
    const values = [
      imageContext.path,
      this.getFileName(imageContext.path),
      this.getFileStem(this.getFileName(imageContext.path)),
      imageFile?.path,
      imageFile?.name,
      imageFile?.basename,
    ];

    return [...new Set(values.map((value) => this.normalizeImageCacheKey(value)).filter(Boolean))];
  }

  private normalizeImageCacheKey(value: string | null | undefined): string {
    if (!value) {
      return "";
    }

    return value.trim().replace(/^<|>$/g, "").split(/[?#]/)[0].toLowerCase();
  }

  private getFileName(value: string | null | undefined): string {
    const normalized = this.normalizeImageCacheKey(value);
    const parts = normalized.split("/");
    return parts[parts.length - 1] ?? "";
  }

  private getFileStem(value: string | null | undefined): string {
    const fileName = this.getFileName(value);
    const extensionStart = fileName.lastIndexOf(".");
    return extensionStart > 0 ? fileName.slice(0, extensionStart) : fileName;
  }

  private getActiveEditor(): Editor | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = view?.editor ?? null;

    if (!editor) {
      new Notice(this.t("noticeOpenEditableNote"));
      return null;
    }

    return editor;
  }

  private t: Translator = (key, values) => createTranslator(this.settings.uiLanguage)(key, values);

  private isMobileRuntime(): boolean {
    return Platform.isMobile;
  }
}

type InsertTarget =
  | {
      type: "cursor";
    }
  | {
      type: "below-line";
      line: number;
    };

export function isMarkdownView(view: unknown): view is MarkdownView {
  return view instanceof MarkdownView;
}
