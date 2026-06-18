import { Editor, MarkdownPostProcessorContext, MarkdownView, Notice, Platform, Plugin, TFile } from "obsidian";
import { readPlaceFromClipboard } from "./clipboard";
import { readExifGps } from "./exif";
import { formatPlace } from "./format";
import {
  ImageContext,
  diagnoseImageResolution,
  findImageContextByPath,
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
      this.registerImageLocationPrompts();
      this.addSettingTab(new GeoCaptureSettingTab(this.app, this));
    } catch (error) {
      console.error("Geo Capture: failed to finish plugin startup.", error);
      new Notice("Geo Capture: startup failed. The plugin was loaded in safe mode.");
    }
  }

  async loadSettings(): Promise<void> {
    const loaded: unknown = await this.loadData();
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
    let currentLocation: GeoPlace | null = null;

    try {
      const provider = this.getNearbyProvider();

      if (!provider) {
        new Notice(this.t("noticeConfigureGooglePlaces"));
        await this.captureCurrentLocation(editor);
        return;
      }

      new Notice(this.t("noticeGettingCurrentLocation"));
      currentLocation = await getCurrentPosition(this.getCurrentPositionLabels());

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

      this.openPlaceListModal([currentLocation, ...places], (place) => this.insertPlace(editor, place));
    } catch (error) {
      console.error(error);
      if (error instanceof CurrentLocationError) {
        this.showLocationError(error);
      } else if (currentLocation) {
        new Notice(this.t("noticeNearbySearchFallbackCurrent"));
        await this.insertPlace(editor, currentLocation);
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

    const point = await this.resolveImageGps(imageContext, { showUnsupportedNotice: true });

    if (!point) {
      new Notice(this.t("noticeNoImageGps"));
      this.openManualPlaceSearch(editor);
      return;
    }

    try {
      const provider = this.getNearbyProvider();

      if (!provider) {
        new Notice(this.t("noticeImageGpsFoundNoProvider"));
        this.openPlaceListModal([point], (place) =>
          this.insertPlace(editor, place, this.getImageInsertTarget(imageContext)),
        );
        return;
      }

      new Notice(this.t("noticeImageGpsSearching"));
      const places = await provider.searchNearby(
        point,
        this.getSearchLanguage(),
        this.settings.nearbyRadiusMeters,
      );

      if (places.length === 0) {
        new Notice(this.t("noticeImageNoNearbyPlaces"));
        this.openPlaceListModal([point], (place) =>
          this.insertPlace(editor, place, this.getImageInsertTarget(imageContext)),
        );
        return;
      }

      this.openPlaceListModal([point, ...places], (place) =>
        this.insertPlace(editor, place, this.getImageInsertTarget(imageContext)),
      );
    } catch (error) {
      console.error(error);
      new Notice(
        error instanceof Error ? `Geo Capture: ${error.message}` : this.t("noticeNearbySearchFallbackImage"),
      );
      this.openPlaceListModal([point], (place) =>
        this.insertPlace(editor, place, this.getImageInsertTarget(imageContext)),
      );
    }
  }

  private registerImageLocationPrompts(): void {
    this.registerMarkdownPostProcessor((el, ctx) => {
      void this.renderImageLocationPrompts(el, ctx);
    });
  }

  private async renderImageLocationPrompts(el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
    if (!this.settings.enableImageLocationPrompts) {
      return;
    }

    const sourceFile = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(sourceFile instanceof TFile)) {
      return;
    }

    const images = Array.from(el.querySelectorAll("img")).filter(
      (image) => !image.closest(".geo-capture-image-prompt"),
    );
    if (images.length === 0) {
      return;
    }

    let content: string;
    try {
      content = await this.app.vault.read(sourceFile);
    } catch (error) {
      console.error("Geo Capture: unable to read source note for image prompts.", error);
      return;
    }

    for (const image of images) {
      await this.renderPromptForImage(image, sourceFile, content);
    }
  }

  private async renderPromptForImage(image: HTMLImageElement, sourceFile: TFile, content: string): Promise<void> {
    if (image.dataset.geoCapturePrompt === "checked") {
      return;
    }
    image.dataset.geoCapturePrompt = "checked";

    const imageTarget = this.getImageTargetFromElement(image);
    if (!imageTarget) {
      return;
    }

    const imageContext = findImageContextByPath(this.app, sourceFile, content, imageTarget);
    if (!imageContext) {
      return;
    }

    const prompt = this.createImagePromptElement(this.t("imagePromptSearching"), true);
    this.placeImagePromptElement(image, prompt);

    const point = await this.resolveImageGps(imageContext, { showUnsupportedNotice: false });
    if (!point) {
      prompt.remove();
      return;
    }

    const button = prompt.querySelector("button");
    const status = prompt.querySelector(".geo-capture-image-prompt-status");
    if (!(button instanceof HTMLButtonElement) || !(status instanceof HTMLElement)) {
      prompt.remove();
      return;
    }

    button.disabled = false;
    button.textContent = this.hasPlaceNearImage(content, imageContext, point)
      ? this.t("imagePromptUpdatePlace")
      : this.t("imagePromptAddPlace");
    status.textContent = this.t("imagePromptGpsReady");
    button.addEventListener("click", () => {
      void this.openImagePromptPlaces(sourceFile, imageContext, point);
    });
  }

  private createImagePromptElement(label: string, disabled: boolean): HTMLElement {
    const prompt = document.createElement("div");
    prompt.className = `geo-capture-image-prompt geo-capture-image-prompt-${this.settings.imagePromptPosition}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "geo-capture-image-prompt-button";
    button.disabled = disabled;
    button.textContent = label;

    const status = document.createElement("span");
    status.className = "geo-capture-image-prompt-status";
    status.textContent = disabled ? "" : this.t("imagePromptGpsReady");

    prompt.append(button, status);
    return prompt;
  }

  private placeImagePromptElement(image: HTMLImageElement, prompt: HTMLElement): void {
    if (this.settings.imagePromptPosition === "inline") {
      image.insertAdjacentElement("afterend", prompt);
      return;
    }

    const parent = image.parentElement;
    if (parent && parent.childElementCount === 1) {
      parent.insertAdjacentElement("afterend", prompt);
      return;
    }

    image.insertAdjacentElement("afterend", prompt);
  }

  private getImageTargetFromElement(image: HTMLImageElement): string | null {
    const alt = image.getAttribute("alt")?.trim();
    if (alt && /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(alt)) {
      return alt;
    }

    const src = image.getAttribute("src")?.trim();
    if (!src) {
      return null;
    }

    try {
      const url = new URL(src);
      return decodeURIComponent(url.pathname.split("/").pop() ?? src);
    } catch {
      return decodeURIComponent(src.split(/[?#]/)[0].split("/").pop() ?? src);
    }
  }

  private async openImagePromptPlaces(sourceFile: TFile, imageContext: ImageContext, point: GeoPlace): Promise<void> {
    try {
      const provider = this.getNearbyProvider();

      if (!provider) {
        new Notice(this.t("noticeImageGpsFoundNoProvider"));
        this.openPlaceListModal([point], (place) => this.insertPlaceIntoFile(sourceFile, place, imageContext));
        return;
      }

      new Notice(this.t("noticeImageGpsSearching"));
      const places = await provider.searchNearby(point, this.getSearchLanguage(), this.settings.nearbyRadiusMeters);

      if (places.length === 0) {
        new Notice(this.t("noticeImageNoNearbyPlaces"));
        this.openPlaceListModal([point], (place) => this.insertPlaceIntoFile(sourceFile, place, imageContext));
        return;
      }

      this.openPlaceListModal([point, ...places], (place) => this.insertPlaceIntoFile(sourceFile, place, imageContext));
    } catch (error) {
      console.error(error);
      new Notice(
        error instanceof Error ? `Geo Capture: ${error.message}` : this.t("noticeNearbySearchFallbackImage"),
      );
      this.openPlaceListModal([point], (place) => this.insertPlaceIntoFile(sourceFile, place, imageContext));
    }
  }

  private async resolveImageGps(
    imageContext: ImageContext,
    options: { showUnsupportedNotice: boolean },
  ): Promise<GeoPlace | null> {
    const imageFile = imageContext.file;

    if (this.settings.autoDetectImageExif && imageFile && isSupportedExifImage(imageFile)) {
      try {
        const arrayBuffer = await this.app.vault.readBinary(imageFile);
        const exifPoint = readExifGps(arrayBuffer);

        if (exifPoint) {
          await this.rememberImageGps(imageContext, imageFile, {
            ...exifPoint,
            label: imageFile.basename,
            sourcePath: imageFile.path,
            updatedAt: Date.now(),
          });

          return {
            ...exifPoint,
            name: this.t("photoLocation", { name: imageFile.basename }),
            address: imageFile.path,
            source: "image-exif",
            confidence: "gps-derived",
          };
        }
      } catch (error) {
        console.error(error);
      }
    } else if (options.showUnsupportedNotice && imageFile && !isSupportedExifImage(imageFile)) {
      new Notice(this.t("noticeUnsupportedImageType"));
    }

    if (this.settings.autoDetectMediaSyncMetadata) {
      const metadataMatch = await findMediaSyncGps(this.app, imageContext.path);
      if (metadataMatch) {
        await this.rememberImageGps(imageContext, imageFile, {
          ...metadataMatch.point,
          label: metadataMatch.label,
          sourcePath: metadataMatch.sourcePath,
          updatedAt: Date.now(),
        });

        return {
          ...metadataMatch.point,
          name: this.t("photoLocation", { name: metadataMatch.label }),
          address: metadataMatch.sourcePath,
          source: "media-sync-metadata",
          confidence: "gps-derived",
        };
      }
    }

    const cachedGps = this.findCachedImageGps(imageContext, imageFile);
    if (cachedGps) {
      return {
        lat: cachedGps.lat,
        lon: cachedGps.lon,
        name: this.t("photoLocation", { name: cachedGps.label }),
        address: cachedGps.sourcePath,
        source: "geo-capture-cache",
        confidence: "gps-derived",
      };
    }

    return null;
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
    const source = exifStatus.startsWith("yes")
      ? this.t("diagnosticSourceExif")
      : diagnostics.matchedEntryHadGps
        ? this.t("diagnosticSourceMetadata")
      : cachedGps
        ? this.t("diagnosticSourceCache")
        : this.t("diagnosticSourceNone");
    const reason = exifStatus.startsWith("yes")
      ? "local EXIF GPS found; metadata fallback not needed"
      : cachedGps
        ? "Geo Capture GPS cache found; local image file not required"
        : diagnostics.reason;
    const next = exifStatus.startsWith("yes")
      ? this.t("diagnosticNextReady")
      : cachedGps
        ? this.t("diagnosticNextUseCache")
        : diagnostics.entriesWithGps > 0 || diagnostics.metadataFound
          ? this.t("diagnosticNextResyncImage")
          : this.t("diagnosticNextCheckGps");

    new Notice(
      this.t("noticeImageLocationDiagnostics", {
        image: imageContext.path,
        source,
        local: imageContext.file ? "yes" : "no",
        exif: exifStatus,
        exifError,
        vaultImages: resolutionDiagnostics.vaultImages,
        sameName: resolutionDiagnostics.sameName,
        sameStem: resolutionDiagnostics.sameStem,
        candidates: resolutionDiagnostics.candidates,
        cache: cachedGps ? `yes ${cachedGps.lat.toFixed(6)},${cachedGps.lon.toFixed(6)}` : "no",
        metadata: diagnostics.metadataFound ? "yes" : "no",
        next,
        reason,
      }),
      12000,
    );
  }

  private async insertPlace(editor: Editor, place: GeoPlace, target?: InsertTarget): Promise<void> {
    if (this.isDuplicatePlace(editor, place)) {
      new Notice(this.t("noticeSkippedDuplicatePlace", { name: place.name }));
      return;
    }

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

  private async insertPlaceIntoFile(file: TFile, place: GeoPlace, imageContext: ImageContext): Promise<void> {
    let inserted = false;

    try {
      await this.app.vault.process(file, (content) => {
        if (this.isDuplicatePlaceInContent(content, place)) {
          new Notice(this.t("noticeSkippedDuplicatePlace", { name: place.name }));
          return content;
        }

        inserted = true;
        return this.insertBelowLineInContent(content, imageContext.line, formatPlace(place, this.settings));
      });

      if (inserted) {
        new Notice(this.t("noticeInsertedPlace", { name: place.name }));
      }
    } catch (error) {
      console.error(error);
      new Notice(this.t("noticeImagePromptInsertFailed"));
    }
  }

  private isDuplicatePlace(editor: Editor, place: GeoPlace): boolean {
    return this.isDuplicatePlaceInContent(editor.getValue(), place);
  }

  private isDuplicatePlaceInContent(noteContent: string, place: GeoPlace): boolean {
    const latPattern = place.lat.toFixed(5).replace(".", "\\.");
    const lonPattern = place.lon.toFixed(5).replace(".", "\\.");
    const coordinateExists = new RegExp(`${latPattern}\\d*\\s*,\\s*${lonPattern}\\d*`).test(noteContent);
    const mapsUrlExists = place.mapsUrl ? noteContent.includes(place.mapsUrl) : false;
    const escapedName = this.escapeRegex(place.name.trim());
    const escapedAddress = this.escapeRegex((place.address ?? "").trim());
    const sameNameAndAddressExists =
      escapedName.length > 0 &&
      escapedAddress.length > 0 &&
      new RegExp(escapedName, "i").test(noteContent) &&
      new RegExp(escapedAddress, "i").test(noteContent);

    return coordinateExists || mapsUrlExists || sameNameAndAddressExists;
  }

  private hasPlaceNearImage(content: string, imageContext: ImageContext, place: GeoPlace): boolean {
    const lines = content.split(/\r?\n/);
    const nearby = lines.slice(imageContext.line + 1, imageContext.line + 7).join("\n");
    return this.isDuplicatePlaceInContent(nearby, place);
  }

  private insertBelowLine(editor: Editor, line: number, markdown: string): void {
    const insertLine = Math.min(line + 1, editor.lineCount());
    const insertText = `\n${markdown}\n`;
    editor.replaceRange(insertText, { line: insertLine, ch: 0 });
    editor.setCursor({ line: insertLine + markdown.split("\n").length, ch: 0 });
  }

  private insertBelowLineInContent(content: string, line: number, markdown: string): string {
    const lines = content.split(/\r?\n/);
    const insertLine = Math.min(line + 1, lines.length);
    lines.splice(insertLine, 0, "", markdown);
    return lines.join("\n");
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
    new PlaceSearchModal(
      this.app,
      this.getSearchProvider(),
      this.getSearchLanguage(),
      this.getTranslator(),
      (place) => {
        void this.insertPlace(editor, place);
      },
    ).open();
  }

  private openPlaceListModal(
    places: GeoPlace[],
    onChoose: (place: GeoPlace) => Promise<void>,
  ): void {
    new PlaceListModal(this.app, places, this.getTranslator(), (place) => {
      void onChoose(place);
    }).open();
  }

  private getTranslator(): Translator {
    return (key, values) => this.t(key, values);
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

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
