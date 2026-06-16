import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { readPlaceFromClipboard } from "./clipboard";
import { readExifGps } from "./exif";
import { formatPlace } from "./format";
import { findNearestImageFile, isSupportedExifImage } from "./images";
import { getCurrentPosition } from "./location";
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
      name: "Insert current location",
      editorCallback: async (editor) => {
        await this.captureCurrentLocation(editor);
      },
    });

    this.addCommand({
      id: "capture-nearby-place",
      name: "Capture nearby place",
      editorCallback: async (editor) => {
        await this.captureNearbyPlace(editor);
      },
    });

    this.addCommand({
      id: "search-place-and-insert",
      name: "Quick insert place",
      editorCallback: (editor) => {
        this.openManualPlaceSearch(editor);
      },
    });

    this.addCommand({
      id: "suggest-place-from-image",
      name: "Suggest place from nearest image",
      editorCallback: async (editor) => {
        await this.capturePlaceFromNearestImage(editor);
      },
    });

    this.addCommand({
      id: "insert-location-from-clipboard",
      name: "Insert location from clipboard",
      editorCallback: async (editor) => {
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

  private async captureCurrentLocation(editor: Editor): Promise<void> {
    try {
      new Notice("Geo Capture: getting current location...");
      const place = await getCurrentPosition();
      await this.insertPlace(editor, place);
    } catch (error) {
      console.error(error);
      new Notice(`Geo Capture: ${error instanceof Error ? error.message : "unable to get location."}`);
    }
  }

  private async captureNearbyPlace(editor: Editor): Promise<void> {
    try {
      const provider = this.getNearbyProvider();

      if (!provider) {
        new Notice("Geo Capture: configure Google Places API key to capture nearby places.");
        await this.captureCurrentLocation(editor);
        return;
      }

      new Notice("Geo Capture: getting current location...");
      const currentLocation = await getCurrentPosition();

      new Notice("Geo Capture: searching nearby places...");
      const places = await provider.searchNearby(
        currentLocation,
        this.settings.searchLanguage,
        this.settings.nearbyRadiusMeters,
      );

      if (places.length === 0) {
        new Notice("Geo Capture: no nearby places found. Inserting raw current location.");
        await this.insertPlace(editor, currentLocation);
        return;
      }

      new PlaceListModal(this.app, [currentLocation, ...places], async (place) => {
        await this.insertPlace(editor, place);
      }).open();
    } catch (error) {
      console.error(error);
      new Notice(`Geo Capture: ${error instanceof Error ? error.message : "nearby capture failed."}`);
    }
  }

  private async captureClipboardLocation(editor: Editor): Promise<void> {
    try {
      const place = await readPlaceFromClipboard();
      if (!place) {
        new Notice("Geo Capture: no supported map link or coordinates found on clipboard.");
        return;
      }

      await this.insertPlace(editor, place);
    } catch (error) {
      console.error(error);
      new Notice("Geo Capture: unable to read clipboard location.");
    }
  }

  private async capturePlaceFromNearestImage(editor: Editor): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();

    if (!(activeFile instanceof TFile)) {
      new Notice("Geo Capture: open a note with an image first.");
      return;
    }

    const imageFile = findNearestImageFile(this.app, editor, activeFile);

    if (!imageFile) {
      new Notice("Geo Capture: no local image found near the cursor. You can enter a place manually.");
      this.openManualPlaceSearch(editor);
      return;
    }

    if (!isSupportedExifImage(imageFile)) {
      new Notice("Geo Capture: this image type is not supported for EXIF GPS yet. You can enter a place manually.");
      this.openManualPlaceSearch(editor);
      return;
    }

    try {
      const arrayBuffer = await this.app.vault.readBinary(imageFile);
      const point = readExifGps(arrayBuffer);

      if (!point) {
        new Notice("Geo Capture: no GPS metadata found in this image. You can enter a place manually.");
        this.openManualPlaceSearch(editor);
        return;
      }

      const photoLocation: GeoPlace = {
        ...point,
        name: `Photo location: ${imageFile.basename}`,
        address: imageFile.path,
        source: "image-exif",
        confidence: "gps-derived",
      };

      const provider = this.getNearbyProvider();

      if (!provider) {
        new Notice("Geo Capture: image GPS found. Configure Google Places to see nearby place suggestions.");
        new PlaceListModal(this.app, [photoLocation], async (place) => {
          await this.insertPlace(editor, place);
        }).open();
        return;
      }

      new Notice("Geo Capture: image GPS found. Searching nearby places...");
      const places = await provider.searchNearby(
        point,
        this.settings.searchLanguage,
        this.settings.nearbyRadiusMeters,
      );

      new PlaceListModal(this.app, [photoLocation, ...places], async (place) => {
        await this.insertPlace(editor, place);
      }).open();
    } catch (error) {
      console.error(error);
      new Notice("Geo Capture: unable to read image metadata. You can enter a place manually.");
      this.openManualPlaceSearch(editor);
    }
  }

  private async insertPlace(editor: Editor, place: GeoPlace): Promise<void> {
    const markdown = formatPlace(place, this.settings);
    editor.replaceSelection(markdown);
    this.ensureTrailingNewline(editor);
    new Notice(`Geo Capture: inserted ${place.name}.`);
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
    if (this.settings.placeProvider === "google" && this.settings.googlePlacesApiKey) {
      return new GooglePlacesProvider(this.settings.googlePlacesApiKey);
    }

    return null;
  }

  private openManualPlaceSearch(editor: Editor): void {
    new PlaceSearchModal(this.app, this.getSearchProvider(), this.settings.searchLanguage, async (place) => {
      await this.insertPlace(editor, place);
    }).open();
  }
}

export function isMarkdownView(view: unknown): view is MarkdownView {
  return view instanceof MarkdownView;
}
