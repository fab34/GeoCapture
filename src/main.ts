import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { readPlaceFromClipboard } from "./clipboard";
import { formatPlace } from "./format";
import { getCurrentPosition } from "./location";
import { NominatimProvider } from "./providers/nominatim";
import { PlaceSearchModal } from "./searchModal";
import { DEFAULT_SETTINGS, GeoCaptureSettingTab } from "./settings";
import { GeoCaptureSettings, GeoPlace } from "./types";

export default class GeoCapturePlugin extends Plugin {
  declare settings: GeoCaptureSettings;
  private searchProvider = new NominatimProvider();

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
      id: "search-place-and-insert",
      name: "Quick insert place",
      editorCallback: (editor) => {
        new PlaceSearchModal(this.app, this.searchProvider, this.settings.searchLanguage, async (place) => {
          await this.insertPlace(editor, place);
        }).open();
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
}

export function isMarkdownView(view: unknown): view is MarkdownView {
  return view instanceof MarkdownView;
}
