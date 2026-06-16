import { App, Notice, SuggestModal } from "obsidian";
import { parseMapText } from "./clipboard";
import { formatSubtitle } from "./placeListModal";
import { GeoPlace, SearchProvider } from "./types";

export class PlaceSearchModal extends SuggestModal<GeoPlace> {
  private provider: SearchProvider;
  private language: string;
  private onChoose: (place: GeoPlace) => void;
  private lastQuery = "";
  private places: GeoPlace[] = [];

  constructor(
    app: App,
    provider: SearchProvider,
    language: string,
    onChoose: (place: GeoPlace) => void,
  ) {
    super(app);
    this.provider = provider;
    this.language = language;
    this.onChoose = onChoose;
    this.setPlaceholder("Search a place, paste a map link, or type lat,lng...");
  }

  async getSuggestions(query: string): Promise<GeoPlace[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }

    if (trimmed === this.lastQuery) {
      return this.places;
    }

    this.lastQuery = trimmed;

    try {
      const parsedPlace = parseMapText(trimmed);
      const searchResults = parsedPlace ? [] : await this.provider.search(trimmed, this.language);
      this.places = parsedPlace ? [parsedPlace] : searchResults;
      return this.places;
    } catch (error) {
      console.error(error);
      new Notice("Geo Capture: place search failed.");
      return [];
    }
  }

  renderSuggestion(place: GeoPlace, el: HTMLElement): void {
    el.createEl("div", { text: place.name });
    el.createEl("div", {
      text: formatSubtitle(place),
      cls: "geo-capture-place-subtitle",
    });
  }

  onChooseSuggestion(place: GeoPlace): void {
    this.onChoose(place);
  }
}
