import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { readPlaceFromClipboard } from "./clipboard";
import { readExifGps } from "./exif";
import { formatPlace } from "./format";
import { ImageContext, findNearestImageContext, isSupportedExifImage } from "./images";
import { createTranslator, getProviderLanguage, Translator } from "./i18n";
import { CurrentLocationError, getCurrentPosition } from "./location";
import { PlaceListModal } from "./placeListModal";
import { GooglePlacesProvider } from "./providers/googlePlaces";
import { NominatimProvider } from "./providers/nominatim";
import { PlaceSearchModal } from "./searchModal";
import { DEFAULT_SETTINGS, GeoCaptureSettingTab } from "./settings";
import { GeoCaptureSettings, GeoPlace, NearbySearchProvider, SearchProvider } from "./types";

export default class GeoCapturePlugin extends Plugin {
  declare settings: GeoCaptureSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

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

    this.addSettingTab(new GeoCaptureSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
        new Notice(this.t("noticeNoClipboardLocation"));
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

    if (!isSupportedExifImage(imageFile)) {
      new Notice(this.t("noticeUnsupportedImageType"));
      this.openManualPlaceSearch(editor);
      return;
    }

    try {
      const arrayBuffer = await this.app.vault.readBinary(imageFile);
      const point = readExifGps(arrayBuffer);

      if (!point) {
        new Notice(this.t("noticeNoImageGps"));
        this.openManualPlaceSearch(editor);
        return;
      }

      const photoLocation: GeoPlace = {
        ...point,
        name: this.t("photoLocation", { name: imageFile.basename }),
        address: imageFile.path,
        source: "image-exif",
        confidence: "gps-derived",
      };

      const provider = this.getNearbyProvider();

      if (!provider) {
        new Notice(this.t("noticeImageGpsFoundNoProvider"));
        new PlaceListModal(this.app, [photoLocation], this.t.bind(this), async (place) => {
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

      new PlaceListModal(this.app, [photoLocation, ...places], this.t.bind(this), async (place) => {
        await this.insertPlace(editor, place, this.getImageInsertTarget(imageContext));
      }).open();
    } catch (error) {
      console.error(error);
      new Notice(this.t("noticeImageMetadataFailed"));
      this.openManualPlaceSearch(editor);
    }
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
